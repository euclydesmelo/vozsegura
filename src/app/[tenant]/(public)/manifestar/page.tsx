import { getCategoriasAtivas, getFeatureFlags, getTenantBySlug, getTiposAtivos } from "@/lib/tenant";
import { criarManifestacao } from "./actions";
import { ManifestarForm } from "./form";
import { CIPA_FLAG_KEY } from "@/lib/supabase/types";

export default async function ManifestarPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);
  const [categorias, tipos, flags] = await Promise.all([
    getCategoriasAtivas(tenant.id),
    getTiposAtivos(tenant.id),
    getFeatureFlags(tenant.id),
  ]);

  const action = criarManifestacao.bind(null, tenant.id, tenant.slug);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl font-semibold mb-2">Registrar manifestação</h1>
      <p className="text-muted mb-8">
        Aberto a colaboradores, clientes, fornecedores e comunidade. Nenhum dado de
        identificação do dispositivo é registrado nesta página.
      </p>
      <ManifestarForm
        action={action}
        categorias={categorias}
        tipos={tipos}
        cipaEnabled={!!flags[CIPA_FLAG_KEY]}
        tenantSlug={slug}
      />
    </div>
  );
}
