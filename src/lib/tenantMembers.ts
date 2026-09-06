import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { TenantRole } from "@/lib/supabase/types";

export type MembroComEmail = {
  id: string;
  user_id: string;
  role: TenantRole;
  nome: string | null;
  email: string | null;
  deve_trocar_senha: boolean;
  created_at: string;
};

export async function listarMembrosComEmail(tenantId: string): Promise<MembroComEmail[]> {
  const supabase = createServiceClient();
  const { data: membros } = await supabase
    .from("tenant_users")
    .select("id, user_id, role, nome, deve_trocar_senha, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at");

  if (!membros) return [];

  return Promise.all(
    membros.map(async (m) => {
      const { data } = await supabase.auth.admin.getUserById(m.user_id);
      return { ...m, email: data.user?.email ?? null };
    })
  );
}

export async function contarAdmins(tenantId: string): Promise<number> {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from("tenant_users")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("role", "admin");
  return count ?? 0;
}
