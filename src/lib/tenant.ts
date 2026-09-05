import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Categoria, FeatureFlag, Tenant, TipoManifestacao } from "@/lib/supabase/types";

export async function getTenantBySlug(slug: string): Promise<Tenant> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) notFound();
  return data;
}

export async function getCategoriasAtivas(tenantId: string): Promise<Categoria[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categorias")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("ativo", true)
    .order("nome");
  return data ?? [];
}

export async function getTiposAtivos(tenantId: string): Promise<TipoManifestacao[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tipos_manifestacao")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("ativo", true)
    .order("nome");
  return data ?? [];
}

export async function getFeatureFlags(tenantId: string): Promise<Record<string, boolean>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("feature_flags")
    .select("flag_key, enabled")
    .eq("tenant_id", tenantId);

  return Object.fromEntries((data ?? []).map((f: Pick<FeatureFlag, "flag_key" | "enabled">) => [f.flag_key, f.enabled]));
}
