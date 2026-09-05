import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client para Server Components / Server Actions — usa a sessão do usuário
 * autenticado (cookies) e respeita RLS normalmente. Nunca usar para gravar
 * manifestações públicas: para isso existe o client de service role.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado de um Server Component sem permissão de escrita de
            // cookies — o middleware cuida de renovar a sessão nesse caso.
          }
        },
      },
    }
  );
}
