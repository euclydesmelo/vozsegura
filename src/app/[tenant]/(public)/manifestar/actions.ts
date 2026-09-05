"use server";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { gerarCodigoAcesso, gerarProtocolo, hashCodigoAcesso } from "@/lib/protocolo";
import { checarRateLimit, getClientIp } from "@/lib/rateLimit";
import { notificarComiteNovaManifestacao, enviarConfirmacaoProtocolo } from "@/lib/notifications";
import { extrairArquivosValidos, salvarAnexos } from "@/lib/storage";

const schema = z
  .object({
    tipo_id: z.string().uuid("Selecione o tipo de manifestação."),
    perfil_manifestante: z.enum(["colaborador", "cliente", "fornecedor", "comunidade", "outro"]),
    categoria_id: z.string().uuid().optional().or(z.literal("")),
    descricao: z.string().trim().min(20, "Descreva com pelo menos 20 caracteres."),
    identificado: z.literal("on").optional(),
    nome: z.string().trim().optional(),
    email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")),
    telefone: z.string().trim().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.identificado === "on") {
      if (!val.nome) {
        ctx.addIssue({ code: "custom", message: "Informe seu nome.", path: ["nome"] });
      }
      if (!val.email && !val.telefone) {
        ctx.addIssue({
          code: "custom",
          message: "Informe e-mail ou telefone para retorno.",
          path: ["email"],
        });
      }
    }
  });

export type ManifestarState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  protocolo?: string;
  codigo?: string;
  identificado?: boolean;
};

export async function criarManifestacao(
  tenantId: string,
  tenantSlug: string,
  _prevState: ManifestarState,
  formData: FormData
): Promise<ManifestarState> {
  const ip = await getClientIp();
  const permitido = await checarRateLimit(`manifestar:${tenantId}:${ip}`, 8, 3600);
  if (!permitido) {
    return {
      status: "error",
      message: "Muitas manifestações enviadas em pouco tempo. Tente novamente mais tarde.",
    };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { status: "error", message: "Revise os campos destacados.", fieldErrors };
  }

  const { tipo_id, perfil_manifestante, categoria_id, descricao, identificado, nome, email, telefone } =
    parsed.data;

  const supabase = createServiceClient();

  const [{ data: categoria }, { data: tenantConfig }, { data: tipo }] = await Promise.all([
    categoria_id
      ? supabase.from("categorias").select("sla_horas").eq("id", categoria_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("tenants").select("sla_padrao_dias").eq("id", tenantId).single(),
    supabase.from("tipos_manifestacao").select("nome").eq("id", tipo_id).single(),
  ]);

  const slaHoras = categoria?.sla_horas ?? (tenantConfig?.sla_padrao_dias ?? 7) * 24;
  const prazoResposta = new Date(Date.now() + slaHoras * 60 * 60 * 1000).toISOString();

  const protocolo = gerarProtocolo();
  const codigo = gerarCodigoAcesso();
  const codigoHash = hashCodigoAcesso(codigo);

  const { data: manifestacao, error } = await supabase
    .from("manifestacoes")
    .insert({
      tenant_id: tenantId,
      protocolo,
      codigo_hash: codigoHash,
      categoria_id: categoria_id || null,
      tipo_id,
      perfil_manifestante,
      identificado: identificado === "on",
      descricao,
      prazo_resposta: prazoResposta,
    })
    .select("id")
    .single();

  if (error || !manifestacao) {
    return {
      status: "error",
      message: "Não foi possível registrar sua manifestação agora. Tente novamente em instantes.",
    };
  }

  if (identificado === "on") {
    await supabase.from("manifestante_identidade").insert({
      manifestacao_id: manifestacao.id,
      tenant_id: tenantId,
      nome: nome || null,
      email: email || null,
      telefone: telefone || null,
    });
  }

  const arquivos = extrairArquivosValidos(formData, "anexos");
  await salvarAnexos(tenantId, manifestacao.id, arquivos);

  await Promise.all([
    notificarComiteNovaManifestacao(tenantSlug, tenantId, protocolo, tipo?.nome ?? "—", "media"),
    identificado === "on" && email
      ? enviarConfirmacaoProtocolo(tenantSlug, email, protocolo, codigo)
      : Promise.resolve(),
  ]);

  return { status: "success", protocolo, codigo, identificado: identificado === "on" };
}
