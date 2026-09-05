import { getAdminContext, requireRole } from "@/lib/admin";
import { listarMembrosComEmail } from "@/lib/tenantMembers";
import { ConvidarForm } from "./convidar-form";
import { MembroRow } from "./membro-row";

export default async function UsuariosPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const { tenant, role } = await getAdminContext(slug);
  requireRole(role, ["admin"]);

  const membros = await listarMembrosComEmail(tenant.id);
  const totalAdmins = membros.filter((m) => m.role === "admin").length;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold mb-1">Usuários do comitê</h1>
      <p className="text-muted mb-6 text-sm max-w-2xl">
        Quem tem acesso a este canal. Ter mais de um administrador é o que permite apurar uma
        manifestação que envolva o próprio administrador principal — vale considerar um segundo
        admin independente para casos assim.
      </p>

      <ConvidarForm tenantSlug={slug} tenantId={tenant.id} />

      <div className="overflow-x-auto rounded border border-border mt-6">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted font-mono">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Desde</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {membros.map((m) => (
              <MembroRow
                key={m.id}
                tenantSlug={slug}
                tenantId={tenant.id}
                membro={m}
                ultimoAdmin={m.role === "admin" && totalAdmins <= 1}
              />
            ))}
            {membros.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  Nenhum membro cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
