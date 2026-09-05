import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client com a service role key — ignora RLS por completo. Só pode ser
 * usado dentro de Server Actions/route handlers que controlam manualmente
 * o que é permitido gravar (é assim que o formulário público de manifestação
 * insere dados sem precisar de uma política de INSERT liberada para "anon").
 *
 * O import "server-only" no topo faz o build falhar caso este arquivo seja
 * acidentalmente importado por um Client Component.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
