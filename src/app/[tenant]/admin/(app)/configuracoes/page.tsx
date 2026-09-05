import { getAdminContext, requireRole } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlags } from "@/lib/tenant";
import { CIPA_FLAG_KEY, type TipoManifestacao } from "@/lib/supabase/types";
import { FlagToggle } from "./flag-toggle";
import { PrivacidadeForm } from "./privacidade-form";
import { RetencaoPainel } from "./retencao-painel";
import { TiposPainel } from "./tipos-painel";

export default async function ConfiguracoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const { tenant, role } = await getAdminContext(slug);
  requireRole(role, ["admin"]);

  const supabase = await createClient();
  const [flags, { data: contagemExpirados }, { data: tipos }] = await Promise.all([
    getFeatureFlags(tenant.id),
    supabase.rpc("contar_dados_expirados", { target_tenant: tenant.id }),
    supabase.from("tipos_manifestacao").select("*").eq("tenant_id", tenant.id).order("nome"),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl font-semibold mb-1">Configurações</h1>
      <p className="text-muted mb-6 text-sm">
        Capacidades que podem ser ligadas ou desligadas sem alterar o cadastro de categorias.
      </p>

      <div className="space-y-3">
        <FlagToggle
          tenantSlug={slug}
          tenantId={tenant.id}
          flagKey={CIPA_FLAG_KEY}
          label="Módulo CIPA / assédio (Lei 14.457/2022)"
          description="Exibe, no formulário público, o aviso legal de garantia de anonimato para denúncias de assédio moral e sexual."
          enabled={!!flags[CIPA_FLAG_KEY]}
        />
      </div>

      <div className="mt-8">
        <TiposPainel tenantSlug={slug} tenantId={tenant.id} tipos={(tipos as TipoManifestacao[]) ?? []} />
      </div>

      <div className="mt-8">
        <PrivacidadeForm tenantSlug={slug} tenant={tenant} />
      </div>

      <div className="mt-8">
        <RetencaoPainel
          tenantSlug={slug}
          tenantId={tenant.id}
          contagemInicial={contagemExpirados ?? 0}
        />
      </div>
    </div>
  );
}
