"use server";

import { getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

/** Chamado depois que o client já trocou a senha via supabase.auth.updateUser
 * — só encerra a pendência (deve_trocar_senha) via função security definer,
 * já que a política de escrita de tenant_users é restrita a admin e quem
 * está trocando a própria senha pode ser comitê/leitor. */
export async function concluirTrocaSenha(tenantSlug: string): Promise<void> {
  const { tenant } = await getAdminContext(tenantSlug);
  const supabase = await createClient();
  await supabase.rpc("concluir_troca_senha_obrigatoria", { target_tenant: tenant.id });
}
