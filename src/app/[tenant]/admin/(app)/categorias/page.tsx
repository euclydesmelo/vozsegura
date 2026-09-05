import { getAdminContext, requireRole } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { Categoria } from "@/lib/supabase/types";
import { CategoriaRow } from "./categoria-row";
import { NovaCategoriaForm } from "./nova-categoria-form";

export default async function CategoriasPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const { tenant, role } = await getAdminContext(slug);
  requireRole(role, ["admin"]);

  const supabase = await createClient();
  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("nome");

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold mb-1">Categorias</h1>
      <p className="text-muted mb-6 text-sm">
        Cadastro mantido pelo administrador. Categorias nunca são excluídas — apenas inativadas,
        e continuam associadas aos casos antigos que já as usaram.
      </p>

      <NovaCategoriaForm tenantSlug={slug} tenantId={tenant.id} />

      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted font-mono">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">SLA</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(categorias as Categoria[] | null)?.map((c) => (
              <CategoriaRow key={c.id} tenantSlug={slug} categoria={c} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
