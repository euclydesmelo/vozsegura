"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext, requireRole } from "@/lib/admin";

const privacidadeSchema = z.object({
  dpo_nome: z.string().trim().optional(),
  dpo_email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")),
  retencao_dias: z.coerce.number().int().min(30, "Mínimo de 30 dias."),
  sla_padrao_dias: z.coerce.number().int().min(1, "Mínimo de 1 dia."),
});

export async function atualizarPrivacidade(
  tenantSlug: string,
  _prevState: { message?: string; error?: boolean } | undefined,
  formData: FormData
) {
  const { role, tenant } = await getAdminContext(tenantSlug);
  requireRole(role, ["admin"]);

  const parsed = privacidadeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Dados inválidos.", error: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tenants")
    .update({
      dpo_nome: parsed.data.dpo_nome || null,
      dpo_email: parsed.data.dpo_email || null,
      retencao_dias: parsed.data.retencao_dias,
      sla_padrao_dias: parsed.data.sla_padrao_dias,
    })
    .eq("id", tenant.id);

  if (error) return { message: "Não foi possível salvar.", error: true };

  revalidatePath(`/${tenantSlug}/admin/configuracoes`);
  revalidatePath(`/${tenantSlug}/privacidade`);
  return { message: "Salvo." };
}

export async function contarDadosExpirados(tenantSlug: string, tenantId: string): Promise<number> {
  const { role } = await getAdminContext(tenantSlug);
  if (role !== "admin") return 0;

  const supabase = await createClient();
  const { data } = await supabase.rpc("contar_dados_expirados", { target_tenant: tenantId });
  return data ?? 0;
}

export async function anonimizarDadosExpirados(
  tenantSlug: string,
  tenantId: string
): Promise<{ removidos: number }> {
  const { role } = await getAdminContext(tenantSlug);
  requireRole(role, ["admin"]);

  const supabase = await createClient();
  const { data } = await supabase.rpc("anonimizar_dados_expirados", { target_tenant: tenantId });

  revalidatePath(`/${tenantSlug}/admin/configuracoes`);
  return { removidos: data ?? 0 };
}

const tipoSchema = z.object({
  nome: z.string().trim().min(2, "Informe um nome."),
  descricao: z.string().trim().optional(),
});

export type TipoState = { message?: string; error?: boolean };

export async function criarTipo(
  tenantSlug: string,
  tenantId: string,
  _prevState: TipoState | undefined,
  formData: FormData
): Promise<TipoState> {
  const { role } = await getAdminContext(tenantSlug);
  requireRole(role, ["admin"]);

  const parsed = tipoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message, error: true };

  const supabase = await createClient();
  const { error } = await supabase.from("tipos_manifestacao").insert({
    tenant_id: tenantId,
    nome: parsed.data.nome,
    descricao: parsed.data.descricao || null,
  });

  if (error) {
    return {
      message: error.code === "23505" ? "Já existe um tipo com esse nome." : "Erro ao salvar.",
      error: true,
    };
  }

  revalidatePath(`/${tenantSlug}/admin/configuracoes`);
  revalidatePath(`/${tenantSlug}/manifestar`);
  return { message: "Tipo criado." };
}

export async function atualizarTipo(
  tenantSlug: string,
  tipoId: string,
  _prevState: TipoState | undefined,
  formData: FormData
): Promise<TipoState> {
  const { role } = await getAdminContext(tenantSlug);
  requireRole(role, ["admin"]);

  const parsed = tipoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message, error: true };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tipos_manifestacao")
    .update({ nome: parsed.data.nome, descricao: parsed.data.descricao || null })
    .eq("id", tipoId);

  if (error) return { message: "Erro ao salvar.", error: true };

  revalidatePath(`/${tenantSlug}/admin/configuracoes`);
  revalidatePath(`/${tenantSlug}/manifestar`);
  return { message: "Salvo." };
}

export async function alternarAtivoTipo(tenantSlug: string, tipoId: string, ativo: boolean) {
  const { role } = await getAdminContext(tenantSlug);
  requireRole(role, ["admin"]);

  const supabase = await createClient();
  await supabase.from("tipos_manifestacao").update({ ativo }).eq("id", tipoId);

  revalidatePath(`/${tenantSlug}/admin/configuracoes`);
  revalidatePath(`/${tenantSlug}/manifestar`);
}

export async function alternarFeatureFlag(
  tenantSlug: string,
  tenantId: string,
  flagKey: string,
  enabled: boolean
) {
  const { role } = await getAdminContext(tenantSlug);
  requireRole(role, ["admin"]);

  const supabase = await createClient();
  const { data: existente } = await supabase
    .from("feature_flags")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("flag_key", flagKey)
    .maybeSingle();

  if (existente) {
    await supabase.from("feature_flags").update({ enabled }).eq("id", existente.id);
  } else {
    await supabase.from("feature_flags").insert({ tenant_id: tenantId, flag_key: flagKey, enabled });
  }

  revalidatePath(`/${tenantSlug}/admin/configuracoes`);
  revalidatePath(`/${tenantSlug}/manifestar`);
}
