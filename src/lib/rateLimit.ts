import "server-only";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Retorna true se a ação for permitida, false se o limite foi excedido.
 * Janela fixa: `maxTentativas` chamadas a cada `janelaSegundos`, por chave.
 */
export async function checarRateLimit(
  chave: string,
  maxTentativas: number,
  janelaSegundos: number
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("checar_rate_limit", {
    p_chave: chave,
    p_max: maxTentativas,
    p_janela_segundos: janelaSegundos,
  });

  if (error) return true; // falha aberta: não travar o canal por erro de infraestrutura
  return data === true;
}
