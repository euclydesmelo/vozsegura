import { getAdminContext, requireRole } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { estaAtrasado } from "@/lib/sla";
import { Tooltip, Info } from "@/components/Info";
import { STATUS_COLOR_VAR } from "@/lib/status";
import type { Criticidade, ManifestacaoStatus } from "@/lib/supabase/types";

type IndicadorCaso = {
  status: ManifestacaoStatus;
  criticidade: Criticidade;
  prazo_resposta: string | null;
  created_at: string;
  encerrado_at: string | null;
  categorias: { nome: string } | null;
  tipos_manifestacao: { nome: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  recebida: "Recebida",
  em_triagem: "Em triagem",
  em_apuracao: "Em apuração",
  concluida: "Concluída",
};

function contarPor<T extends string>(itens: T[]): Record<string, number> {
  return itens.reduce<Record<string, number>>((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});
}

function StatTile({
  label,
  valor,
  destaque,
  texto,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
  texto: string;
}) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-muted font-mono flex items-center gap-1">
        {label}
        <Info texto={texto} />
      </p>
      <p className={`text-2xl font-serif font-semibold mt-1 ${destaque ? "text-danger" : ""}`}>
        {valor}
      </p>
    </div>
  );
}

/** Lista ordenada com barra horizontal — mesma anatomia para "Por tipo" e
 * "Recorrência por categoria": rótulo truncado com tooltip, barra proporcional
 * ao total, contagem ao final. Uma única cor (o dado é magnitude por
 * categoria nomeada, não precisa de uma cor por item — o rótulo já identifica
 * cada linha). */
function BarraRanking({
  dados,
  total,
  vazio,
}: {
  dados: [string, number][];
  total: number;
  vazio: string;
}) {
  if (dados.length === 0) {
    return <p className="text-sm text-muted">{vazio}</p>;
  }
  const maior = Math.max(...dados.map(([, c]) => c));
  return (
    <div className="space-y-2.5">
      {dados.map(([nome, contagem]) => (
        <div key={nome} className="flex items-center gap-3 text-sm">
          <Tooltip texto={nome} className="w-32 sm:w-40 shrink-0">
            <span className="block w-32 sm:w-40 truncate text-muted text-left">{nome}</span>
          </Tooltip>
          <div className="flex-1 bg-border rounded h-2.5 overflow-hidden">
            <div
              className="bg-accent h-full rounded"
              style={{ width: `${maior > 0 ? (contagem / maior) * 100 : 0}%` }}
            />
          </div>
          <span className="font-mono w-6 text-right">{contagem}</span>
        </div>
      ))}
      <p className="text-xs text-muted pt-1">Barras proporcionais ao maior valor da lista, não ao total de {total} casos.</p>
    </div>
  );
}

/** Anel de status — cada fatia usa a mesma cor do selo de status usado no
 * resto do painel e na consulta pública (STATUS_COLOR_VAR), então "Em
 * triagem" aqui é a mesma cor de "Em triagem" na listagem de casos. */
function DonutStatus({ porStatus, total }: { porStatus: Record<string, number>; total: number }) {
  const raio = 52;
  const circunferencia = 2 * Math.PI * raio;
  let acumulado = 0;

  const fatias = Object.keys(STATUS_LABEL).map((key) => {
    const valor = porStatus[key] ?? 0;
    const fracao = total > 0 ? valor / total : 0;
    const tracoAceso = fracao * circunferencia;
    const offset = -acumulado * circunferencia;
    acumulado += fracao;
    return { key, valor, fracao, tracoAceso, offset };
  });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 128 128" width="128" height="128" className="shrink-0">
        <circle cx="64" cy="64" r={raio} fill="none" stroke="var(--border)" strokeWidth="16" />
        <g transform="rotate(-90 64 64)">
          {fatias.map(
            (f) =>
              f.valor > 0 && (
                <circle
                  key={f.key}
                  cx="64"
                  cy="64"
                  r={raio}
                  fill="none"
                  stroke={STATUS_COLOR_VAR[f.key]}
                  strokeWidth="16"
                  strokeDasharray={`${f.tracoAceso} ${circunferencia - f.tracoAceso}`}
                  strokeDashoffset={f.offset}
                />
              )
          )}
        </g>
        <text x="64" y="60" textAnchor="middle" className="fill-foreground" style={{ font: "600 22px 'IBM Plex Serif', serif" }}>
          {total}
        </text>
        <text x="64" y="78" textAnchor="middle" className="fill-muted" style={{ font: "400 10px 'IBM Plex Sans', sans-serif" }}>
          casos
        </text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {fatias.map((f) => (
          <li key={f.key} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: STATUS_COLOR_VAR[f.key] }}
            />
            <span className="text-muted">{STATUS_LABEL[f.key]}</span>
            <span className="font-mono ml-auto pl-3">
              {f.valor} <span className="text-muted">({(f.fracao * 100).toFixed(0)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function IndicadoresPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const { tenant, role } = await getAdminContext(slug);
  requireRole(role, ["admin"]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("manifestacoes")
    .select(
      "status, criticidade, prazo_resposta, created_at, encerrado_at, categorias(nome), tipos_manifestacao(nome)"
    )
    .eq("tenant_id", tenant.id);

  const casos = (data ?? []) as unknown as IndicadorCaso[];

  const total = casos.length;
  const porStatus = contarPor(casos.map((c) => c.status));
  const porTipo = contarPor(casos.map((c) => c.tipos_manifestacao?.nome ?? "Sem tipo"));
  const tiposOrdenados = Object.entries(porTipo).sort((a, b) => b[1] - a[1]);
  const concluidos = casos.filter((c) => c.status === "concluida" && c.encerrado_at);
  const taxaResolucao = total > 0 ? (concluidos.length / total) * 100 : 0;
  const atrasados = casos.filter((c) => estaAtrasado(c.status, c.prazo_resposta)).length;

  const temposResposta = concluidos.map(
    (c) => (new Date(c.encerrado_at!).getTime() - new Date(c.created_at).getTime()) / 86_400_000
  );
  const tempoMedioDias =
    temposResposta.length > 0
      ? temposResposta.reduce((a, b) => a + b, 0) / temposResposta.length
      : null;

  const porCategoria = contarPor(casos.map((c) => c.categorias?.nome ?? "Sem categoria"));
  const categoriasOrdenadas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-4xl">
      <h1 className="font-serif text-2xl font-semibold mb-1">Indicadores</h1>
      <p className="text-muted mb-6 text-sm">
        Efetividade do canal, na linha dos indicadores da ISO 37002 — útil também para o dossiê de
        governança de financiamentos e incentivos.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile
          label="Total de casos"
          valor={String(total)}
          texto="Todas as manifestações já registradas neste canal, em qualquer status."
        />
        <StatTile
          label="Taxa de resolução"
          valor={`${taxaResolucao.toFixed(0)}%`}
          texto="Percentual de casos concluídos (com data de encerramento) sobre o total de casos."
        />
        <StatTile
          label="Tempo médio de resposta"
          valor={tempoMedioDias !== null ? `${tempoMedioDias.toFixed(1)}d` : "—"}
          texto="Média de dias entre o registro e a conclusão, considerando só os casos já concluídos."
        />
        <StatTile
          label="Casos atrasados"
          valor={String(atrasados)}
          destaque={atrasados > 0}
          texto="Casos ainda não concluídos cujo prazo de resposta já passou."
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-8">
        <div>
          <h2 className="text-sm font-medium mb-3 flex items-center gap-1">
            Por status
            <Info texto="Distribuição de todos os casos pelas quatro etapas do fluxo de atendimento — as mesmas cores usadas no selo de status da listagem de casos." />
          </h2>
          {total === 0 ? (
            <p className="text-sm text-muted">Nenhum caso registrado ainda.</p>
          ) : (
            <DonutStatus porStatus={porStatus} total={total} />
          )}
        </div>

        <div>
          <h2 className="text-sm font-medium mb-3 flex items-center gap-1">
            Por tipo
            <Info texto="Quais tipos de manifestação (denúncia, elogio, sugestão...) mais aparecem neste canal. Tipos são cadastrados em Configurações." />
          </h2>
          <BarraRanking dados={tiposOrdenados} total={total} vazio="Nenhum caso registrado ainda." />
        </div>

        <div className="sm:col-span-2">
          <h2 className="text-sm font-medium mb-3 flex items-center gap-1">
            Recorrência por categoria
            <Info texto="Onde as manifestações mais se concentram — ajuda a priorizar ações de prevenção por área." />
          </h2>
          <BarraRanking
            dados={categoriasOrdenadas}
            total={total}
            vazio="Nenhum caso registrado ainda."
          />
        </div>
      </div>
    </div>
  );
}
