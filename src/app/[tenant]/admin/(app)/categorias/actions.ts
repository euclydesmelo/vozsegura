"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext, requireRole } from "@/lib/admin";

const categoriaSchema = z.object({
  nome: z.string().trim().min(2, "Informe um nome."),
  descricao: z.string().trim().optional(),
  sla_horas: z.coerce.number().int().positive("Informe um SLA válido em horas."),
});

export type CategoriaState = { message?: string; error?: boolean };

export async function criarCategoria(
  tenantSlug: string,
  tenantId: string,
  _prevState: CategoriaState | undefined,
  formData: FormData
): Promise<CategoriaState> {
  const { role } = await getAdminContext(tenantSlug);
  requireRole(role, ["admin"]);

  const parsed = categoriaSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message, error: true };

  const supabase = await createClient();
  const { error } = await supabase.from("categorias").insert({
    tenant_id: tenantId,
    nome: parsed.data.nome,
    descricao: parsed.data.descricao || null,
    sla_horas: parsed.data.sla_horas,
  });

  if (error) {
    return {
      message: error.code === "23505" ? "Já existe uma categoria com esse nome." : "Erro ao salvar.",
      error: true,
    };
  }

  revalidatePath(`/${tenantSlug}/admin/categorias`);
  return { message: "Categoria criada." };
}

export async function atualizarCategoria(
  tenantSlug: string,
  categoriaId: string,
  _prevState: CategoriaState | undefined,
  formData: FormData
): Promise<CategoriaState> {
  const { role } = await getAdminContext(tenantSlug);
  requireRole(role, ["admin"]);

  const parsed = categoriaSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message, error: true };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categorias")
    .update({
      nome: parsed.data.nome,
      descricao: parsed.data.descricao || null,
      sla_horas: parsed.data.sla_horas,
    })
    .eq("id", categoriaId);

  if (error) return { message: "Erro ao salvar.", error: true };

  revalidatePath(`/${tenantSlug}/admin/categorias`);
  return { message: "Salvo." };
}

export async function alternarAtivoCategoria(
  tenantSlug: string,
  categoriaId: string,
  ativo: boolean
) {
  const { role } = await getAdminContext(tenantSlug);
  requireRole(role, ["admin"]);

  const supabase = await createClient();
  await supabase.from("categorias").update({ ativo }).eq("id", categoriaId);

  revalidatePath(`/${tenantSlug}/admin/categorias`);
}
