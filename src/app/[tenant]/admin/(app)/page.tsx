import Link from "next/link";
import { getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { listarMembrosComEmail } from "@/lib/tenantMembers";
import { estaAtrasado } from "@/lib/sla";
import { STATUS_LABEL, STATUS_BADGE_STYLE } from "@/lib/status";
import type { Manifestacao } from "@/lib/supabase/types";

const CRITICIDADE_DOT: Record<string, string> = {
  baixa: "bg-border",
  media: "bg-brass",
  alta: "bg-danger",
};

export default async function CasosPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ status?: string; atrasados?: string; q?: string; meus?: string }>;
}) {
  const { tenant: slug } = await params;
  const { status, atrasados, q, meus } = await searchParams;
  const { tenant, tenantUserId } = await getAdminContext(slug);

  const supabase = await createClient();
  let query = supabase
    .from("manifestacoes")
    .select("*, categorias(id, nome), tipos_manifestacao(id, nome)")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (atrasados) {
    query = query.neq("status", "concluida").lt("prazo_resposta", new Date().toISOString());
  }
  if (meus) query = query.eq("atribuido_a", tenantUserId);
  if (q?.trim()) {
    const termo = q.trim().replace(/[%_]/g, "");
    query = query.or(`protocolo.ilike.%${termo}%,descricao.ilike.%${termo}%`);
  }

  const [{ data: casos }, membros] = await Promise.all([
    query,
    listarMembrosComEmail(tenant.id),
  ]);
  const membrosPorId = new Map(membros.map((m) => [m.id, m]));

  const total = casos?.length ?? 0;
  const atrasadosCount = (casos ?? []).filter((c) => estaAtrasado(c.status, c.prazo_resposta)).length;

  const filtros = [
    { value: "", label: "Todos" },
    ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-1">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Casos</h1>
          <p className="text-xs text-muted mt-0.5">
            {total} caso{total !== 1 ? "s" : ""}
            {atrasadosCount > 0 && (
              <span className="text-danger"> · {atrasadosCount} com prazo vencido</span>
            )}
          </p>
        </div>
        <form method="GET" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por protocolo ou relato..."
            className="w-64 rounded border border-border bg-background px-3 py-1.5 text-sm"
          />
          <button type="submit" className="px-3 py-1.5 rounded border border-border text-sm text-muted">
            Buscar
          </button>
        </form>
        <div className="flex gap-2 text-sm">
          {filtros.map((f) => (
            <Link
              key={f.value}
              href={f.value ? `?status=${f.value}` : "?"}
              className={`px-3 py-1 rounded border ${
                !atrasados && (status ?? "") === f.value
                  ? "border-accent text-accent"
                  : "border-border text-muted"
              }`}
            >
              {f.label}
            </Link>
          ))}
          <Link
            href="?atrasados=1"
            title="Casos não concluídos cujo prazo de resposta já passou."
            className={`px-3 py-1 rounded border ${
              atrasados ? "border-danger text-danger" : "border-border text-muted"
            }`}
          >
            Atrasados
          </Link>
          <Link
            href="?meus=1"
            title="Casos atribuídos a você."
            className={`px-3 py-1 rounded border ${
              meus ? "border-accent text-accent" : "border-border text-muted"
            }`}
          >
            Meus casos
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted font-mono">
            <tr>
              <th className="px-4 py-3">Protocolo</th>
              <th className="px-4 py-3">Registrado em</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Criticidade</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Atribuído</th>
              <th className="px-4 py-3">Prazo</th>
            </tr>
          </thead>
          <tbody>
            {(casos as Manifestacao[] | null)?.map((c) => {
              const atrasado = estaAtrasado(c.status, c.prazo_resposta);
              return (
                <tr key={c.id} className="border-t border-border hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link
                      href={`/${slug}/admin/casos/${c.id}`}
                      className="font-mono text-accent hover:underline"
                    >
                      {c.protocolo}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs whitespace-nowrap">
                    {new Date(c.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">{c.tipos_manifestacao?.nome ?? "—"}</td>
                  <td className="px-4 py-3">{c.categorias?.nome ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${CRITICIDADE_DOT[c.criticidade] ?? "bg-border"}`}
                    />
                    {c.criticidade}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_BADGE_STYLE[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c.atribuido_a
                      ? membrosPorId.get(c.atribuido_a)?.nome ||
                        membrosPorId.get(c.atribuido_a)?.email ||
                        "—"
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {atrasado ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-danger-soft text-danger font-medium">
                        Atrasado · {new Date(c.prazo_resposta!).toLocaleDateString("pt-BR")}
                      </span>
                    ) : (
                      <span className="text-muted">
                        {c.prazo_resposta
                          ? new Date(c.prazo_resposta).toLocaleDateString("pt-BR")
                          : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {(!casos || casos.length === 0) && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  Nenhum caso encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
