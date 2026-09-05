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

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("id, role, nome")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!tenantUser) {
    redirect(`/${slug}/admin/login?erro=sem-acesso`);
  }

  return {
    tenant,
    user,
    role: tenantUser.role as TenantRole,
    tenantUserId: tenantUser.id,
    nome: tenantUser.nome as string | null,
  };
}

export function requireRole(role: TenantRole, allowed: TenantRole[]) {
  if (!allowed.includes(role)) {
    redirect("..");
  }
}
