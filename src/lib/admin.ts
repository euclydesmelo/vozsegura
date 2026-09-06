import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant";
import type { TenantRole } from "@/lib/supabase/types";

export async function getAdminContext(slug: string) {
  const tenant = await getTenantBySlug(slug);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${slug}/admin/login`);
  }

  const { data: tenantUser, error } = await supabase
    .from("tenant_users")
    .select("id, role, nome, deve_trocar_senha")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  // Erro de consulta (ex.: coluna nova ainda não migrada em produção) não é
  // a mesma coisa que "este usuário não tem acesso" — tratar os dois casos
  // como idênticos já escondeu um bug real de deploy atrás de uma mensagem
  // de permissão. Aqui vira erro 500 de verdade, não redireciona.
  if (error) {
    console.error("Falha ao consultar tenant_users em getAdminContext:", error);
    throw new Error("Não foi possível verificar seu acesso a este canal. Tente novamente em instantes.");
  }

  if (!tenantUser) {
    redirect(`/${slug}/admin/login?erro=sem-acesso`);
  }

  return {
    tenant,
    user,
    role: tenantUser.role as TenantRole,
    tenantUserId: tenantUser.id,
    nome: tenantUser.nome as string | null,
    deveTrocarSenha: tenantUser.deve_trocar_senha as boolean,
  };
}

export function requireRole(role: TenantRole, allowed: TenantRole[]) {
  if (!allowed.includes(role)) {
    redirect("..");
  }
}
