"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAdminContext, requireRole } from "@/lib/admin";
import { getBaseUrl } from "@/lib/email";
import { gerarSenhaTemporaria } from "@/lib/senha";
import type { TenantRole } from "@/lib/supabase/types";

export type MembroState = { message?: string; error?: boolean; senhaTemporaria?: string };

const convidarSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome."),
  email: z.string().trim().email("E-mail inválido."),
  role: z.enum(["admin", "comite", "leitor"]),
  modo: z.enum(["convite", "senha_temporaria"]),
});

export async function convidarMembro(
  tenantSlug: string,
  tenantId: string,
  _prevState: MembroState | undefined,
  formData: FormData
): Promise<MembroState> {
  const { role: papelDoAtor } = await getAdminContext(tenantSlug);
  requireRole(papelDoAtor, ["admin"]);

  const parsed = convidarSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Dados inválidos.", error: true };
  }
  const { nome, email, role, modo } = parsed.data;

  const supabase = await createClient();
  const { data: existenteId } = await supabase.rpc("buscar_user_id_por_email", { p_email: email });

  const jaExistia = !!existenteId;
  let userId = existenteId as string | null;
  let senhaTemporaria: string | undefined;

  if (!userId) {
    const service = createServiceClient();

    if (modo === "senha_temporaria") {
      senhaTemporaria = gerarSenhaTemporaria();
      const { data, error } = await service.auth.admin.createUser({
        email,
        password: senhaTemporaria,
        email_confirm: true,
      });
      if (error || !data.user) {
        return { message: `Não foi possível criar o usuário: ${error?.message ?? "erro desconhecido"}`, error: true };
      }
      userId = data.user.id;
    } else {
      const { data, error } = await service.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${getBaseUrl()}/${tenantSlug}/admin/confirmar`,
      });
      if (error || !data.user) {
        return { message: `Não foi possível convidar: ${error?.message ?? "erro desconhecido"}`, error: true };
      }
      userId = data.user.id;
    }
  }

  const { error: insertError } = await supabase.from("tenant_users").insert({
    tenant_id: tenantId,
    user_id: userId,
    role,
    nome,
    deve_trocar_senha: !!senhaTemporaria,
  });

  if (insertError) {
    return {
      message: insertError.code === "23505" ? "Esse e-mail já faz parte do time." : "Não foi possível adicionar.",
      error: true,
    };
  }

  revalidatePath(`/${tenantSlug}/admin/usuarios`);

  if (senhaTemporaria) {
    return {
      message: "Usuário criado com senha temporária — copie e repasse com segurança, ela não aparece de novo.",
      senhaTemporaria,
    };
  }
  if (jaExistia) {
    return { message: "Esse e-mail já tinha conta na plataforma — vinculado a este canal." };
  }
  return { message: "Convite enviado." };
}

async function contarAdminsAtual(tenantId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("tenant_users")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("role", "admin");
  return count ?? 0;
}

export async function atualizarPapelMembro(
  tenantSlug: string,
  tenantId: string,
  tenantUserId: string,
  novoPapel: TenantRole
): Promise<{ message?: string }> {
  const { role } = await getAdminContext(tenantSlug);
  requireRole(role, ["admin"]);

  const supabase = await createClient();
  const { data: membro } = await supabase
    .from("tenant_users")
    .select("role")
    .eq("id", tenantUserId)
    .maybeSingle();

  if (membro?.role === "admin" && novoPapel !== "admin" && (await contarAdminsAtual(tenantId)) <= 1) {
    return { message: "Precisa haver ao menos um administrador — adicione outro antes de rebaixar este." };
  }

  await supabase.from("tenant_users").update({ role: novoPapel }).eq("id", tenantUserId);
  revalidatePath(`/${tenantSlug}/admin/usuarios`);
  return {};
}

export async function removerMembro(
  tenantSlug: string,
  tenantId: string,
  tenantUserId: string
): Promise<{ message?: string }> {
  const { role } = await getAdminContext(tenantSlug);
  requireRole(role, ["admin"]);

  const supabase = await createClient();
  const { data: membro } = await supabase
    .from("tenant_users")
    .select("role")
    .eq("id", tenantUserId)
    .maybeSingle();

  if (membro?.role === "admin" && (await contarAdminsAtual(tenantId)) <= 1) {
    return { message: "Precisa haver ao menos um administrador — adicione outro antes de remover este." };
  }

  await supabase.from("tenant_users").delete().eq("id", tenantUserId);
  revalidatePath(`/${tenantSlug}/admin/usuarios`);
  return {};
}
