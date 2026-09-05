"use server";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { verificarCodigoAcesso } from "@/lib/protocolo";
import { checarRateLimit, getClientIp } from "@/lib/rateLimit";
import { notificarComiteNovaMensagem } from "@/lib/notifications";
import { listarAnexosComUrl } from "@/lib/storage";
import { STATUS_LABEL } from "@/lib/status";
import type { Mensagem } from "@/lib/supabase/types";

export type ConsultaResult =
  | {
      ok: true;
      protocolo: string;
      status: string;
      statusLabel: string;
      categoriaNome: string | null;
      criadaEm: string;
      mensagens: Pick<Mensagem, "id" | "autor_tipo" | "corpo" | "created_at">[];
      anexos: { id: string; nome: string; url: string | null }[];
    }
  | { ok: false; message: string };

async function localizarManifestacao(tenantSlug: string, protocolo: string, codigo: string) {
  const ip = await getClientIp();
  const permitido = await checarRateLimit(`consultar:${tenantSlug}:${ip}`, 20, 600);
  if (!permitido) return "rate_limited" as const;

  const supabase = createServiceClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug)
    .maybeSingle();
  if (!tenant) return null;

  const { data: manifestacao } = await supabase
    .from("manifestacoes")
    .select("id, tenant_id, status, codigo_hash, created_at, categorias(nome)")
    .eq("tenant_id", tenant.id)
    .eq("protocolo", protocolo.trim().toUpperCase())
    .maybeSingle();

  if (!manifestacao) return null;
  if (!verificarCodigoAcesso(codigo.trim().toUpperCase(), manifestacao.codigo_hash)) return null;

  return manifestacao;
}

const consultaSchema = z.object({
  protocolo: z.string().trim().min(1),
  codigo: z.string().trim().min(1),
});

export async function consultarManifestacao(
  tenantSlug: string,
  protocolo: string,
  codigo: string
): Promise<ConsultaResult> {
  const parsed = consultaSchema.safeParse({ protocolo, codigo });
  if (!parsed.success) return { ok: false, message: "Informe protocolo e código de acesso." };

  const manifestacao = await localizarManifestacao(tenantSlug, parsed.data.protocolo, parsed.data.codigo);
  if (manifestacao === "rate_limited") {
    return { ok: false, message: "Muitas tentativas em pouco tempo. Aguarde alguns minutos." };
  }
  if (!manifestacao) {
    return { ok: false, message: "Protocolo ou código de acesso inválidos." };
  }

  const supabase = createServiceClient();
  const [{ data: mensagens }, anexos] = await Promise.all([
    supabase
      .from("mensagens")
      .select("id, autor_tipo, corpo, created_at")
      .eq("manifestacao_id", manifestacao.id)
      .order("created_at"),
    listarAnexosComUrl(manifestacao.id),
  ]);

  const categoria = manifestacao.categorias as unknown as { nome: string } | null;

  return {
    ok: true,
    protocolo: parsed.data.protocolo.trim().toUpperCase(),
    status: manifestacao.status,
    statusLabel: STATUS_LABEL[manifestacao.status] ?? manifestacao.status,
    categoriaNome: categoria?.nome ?? null,
    criadaEm: manifestacao.created_at,
    mensagens: mensagens ?? [],
    anexos,
  };
}

export async function enviarMensagemManifestante(
  tenantSlug: string,
  protocolo: string,
  codigo: string,
  corpo: string
): Promise<ConsultaResult> {
  const corpoLimpo = corpo.trim();
  if (corpoLimpo.length < 3) {
    return { ok: false, message: "Escreva uma mensagem antes de enviar." };
  }

  const manifestacao = await localizarManifestacao(tenantSlug, protocolo, codigo);
  if (manifestacao === "rate_limited") {
    return { ok: false, message: "Muitas tentativas em pouco tempo. Aguarde alguns minutos." };
  }
  if (!manifestacao) {
    return { ok: false, message: "Protocolo ou código de acesso inválidos." };
  }
  if (manifestacao.status === "concluida") {
    return { ok: false, message: "Este caso foi concluído e não aceita mais novas mensagens." };
  }

  const supabase = createServiceClient();
  await supabase.from("mensagens").insert({
    tenant_id: manifestacao.tenant_id,
    manifestacao_id: manifestacao.id,
    autor_tipo: "manifestante",
    corpo: corpoLimpo,
  });

  await notificarComiteNovaMensagem(tenantSlug, manifestacao.tenant_id, protocolo.trim().toUpperCase());

  return consultarManifestacao(tenantSlug, protocolo, codigo);
}
