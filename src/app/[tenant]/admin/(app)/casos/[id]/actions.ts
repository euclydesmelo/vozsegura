"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/admin";
import { notificarManifestanteResposta } from "@/lib/notifications";

const atualizarSchema = z
  .object({
    status: z.enum(["recebida", "em_triagem", "em_apuracao", "concluida"]),
    criticidade: z.enum(["baixa", "media", "alta"]),
    categoria_id: z.string().uuid().optional().or(z.literal("")),
    atribuido_a: z.string().uuid().optional().or(z.literal("")),
    resolucao: z.string().trim().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.status === "concluida" && !val.resolucao) {
      ctx.addIssue({
        code: "custom",
        message: "Descreva o parecer/desfecho antes de encerrar o caso.",
        path: ["resolucao"],
      });
    }
  });

export async function atualizarCaso(
  tenantSlug: string,
  casoId: string,
  _prevState: { message?: string; error?: boolean } | undefined,
  formData: FormData
) {
  await getAdminContext(tenantSlug);

  const parsed = atualizarSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Dados inválidos.", error: true };
  }

  const supabase = await createClient();
  const { status, criticidade, categoria_id, atribuido_a, resolucao } = parsed.data;

  const { data: casoAtual } = await supabase
    .from("manifestacoes")
    .select("tenant_id, categoria_id, created_at")
    .eq("id", casoId)
    .maybeSingle();

  let prazoResposta: string | undefined;
  if (casoAtual && categoria_id && categoria_id !== casoAtual.categoria_id) {
    const [{ data: categoria }, { data: tenantConfig }] = await Promise.all([
      supabase.from("categorias").select("sla_horas").eq("id", categoria_id).single(),
      supabase.from("tenants").select("sla_padrao_dias").eq("id", casoAtual.tenant_id).single(),
    ]);
    const slaHoras = categoria?.sla_horas ?? (tenantConfig?.sla_padrao_dias ?? 7) * 24;
    prazoResposta = new Date(
      new Date(casoAtual.created_at).getTime() + slaHoras * 60 * 60 * 1000
    ).toISOString();
  }

  const { error } = await supabase
    .from("manifestacoes")
    .update({
      status,
      criticidade,
      categoria_id: categoria_id || null,
      atribuido_a: atribuido_a || null,
      resolucao: resolucao || null,
      encerrado_at: status === "concluida" ? new Date().toISOString() : null,
      ...(prazoResposta ? { prazo_resposta: prazoResposta } : {}),
    })
    .eq("id", casoId);

  if (error) return { message: "Não foi possível salvar. Verifique suas permissões.", error: true };

  revalidatePath(`/${tenantSlug}/admin/casos/${casoId}`);
  revalidatePath(`/${tenantSlug}/admin`);
  return { message: "Salvo." };
}

export async function responderCaso(
  tenantSlug: string,
  casoId: string,
  tenantId: string,
  corpo: string
): Promise<{ ok: boolean; message?: string }> {
  const { tenantUserId } = await getAdminContext(tenantSlug);
  const corpoLimpo = corpo.trim();
  if (!corpoLimpo) return { ok: false };

  const supabase = await createClient();

  const { data: casoAtual } = await supabase
    .from("manifestacoes")
    .select("status")
    .eq("id", casoId)
    .maybeSingle();

  if (casoAtual?.status === "concluida") {
    return { ok: false, message: "Este caso está concluído — não é possível enviar novas mensagens." };
  }

  await supabase.from("mensagens").insert({
    tenant_id: tenantId,
    manifestacao_id: casoId,
    autor_tipo: "comite",
    autor_tenant_user_id: tenantUserId,
    corpo: corpoLimpo,
  });

  // Automação do fluxo: a primeira resposta do comitê é o sinal mais claro
  // de que a apuração começou — avança o status sozinho. Não mexe se o
  // caso já estiver em apuração/concluído.
  await supabase
    .from("manifestacoes")
    .update({ status: "em_apuracao" })
    .eq("id", casoId)
    .in("status", ["recebida", "em_triagem"]);

  // Quem faz o primeiro movimento de trabalho no caso (responder ou anotar)
  // vira o responsável por ele, se ninguém tiver sido atribuído ainda — não
  // sobrescreve uma atribuição manual já feita por outra pessoa.
  await supabase
    .from("manifestacoes")
    .update({ atribuido_a: tenantUserId })
    .eq("id", casoId)
    .is("atribuido_a", null);

  const { data: caso } = await supabase
    .from("manifestacoes")
    .select("protocolo")
    .eq("id", casoId)
    .maybeSingle();

  if (caso) {
    await notificarManifestanteResposta(tenantSlug, casoId, caso.protocolo);
  }

  revalidatePath(`/${tenantSlug}/admin/casos/${casoId}`);
  revalidatePath(`/${tenantSlug}/admin`);
  return { ok: true };
}

export async function adicionarNotaInterna(
  tenantSlug: string,
  casoId: string,
  tenantId: string,
  corpo: string
) {
  const { tenantUserId } = await getAdminContext(tenantSlug);
  const corpoLimpo = corpo.trim();
  if (!corpoLimpo) return;

  const supabase = await createClient();
  await supabase.from("notas_internas").insert({
    tenant_id: tenantId,
    manifestacao_id: casoId,
    autor_tenant_user_id: tenantUserId,
    corpo: corpoLimpo,
  });

  // Mesma automação do fluxo: uma nota interna já é trabalho de apuração
  // em andamento, mesmo antes de qualquer resposta ao manifestante.
  await supabase
    .from("manifestacoes")
    .update({ status: "em_apuracao" })
    .eq("id", casoId)
    .in("status", ["recebida", "em_triagem"]);

  await supabase
    .from("manifestacoes")
    .update({ atribuido_a: tenantUserId })
    .eq("id", casoId)
    .is("atribuido_a", null);

  revalidatePath(`/${tenantSlug}/admin/casos/${casoId}`);
  revalidatePath(`/${tenantSlug}/admin`);
}
