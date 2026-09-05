"use client";

import { useActionState, useState, useTransition } from "react";
import type { Categoria, Manifestacao, Mensagem, NotaInterna } from "@/lib/supabase/types";
import type { MembroComEmail } from "@/lib/tenantMembers";
import { estaAtrasado } from "@/lib/sla";
import { PERFIL_LABEL } from "@/lib/perfil";
import { Info } from "@/components/Info";
import { Toast } from "@/components/Toast";
import { atualizarCaso, responderCaso, adicionarNotaInterna } from "./actions";

type AnexoComUrl = { id: string; nome: string; url: string | null };

const ROLE_LABEL: Record<string, string> = {
  admin: "administrador",
  comite: "comitê",
  leitor: "leitor",
};

function nomeMembro(m: MembroComEmail): string {
  return m.nome || m.email || "Sem nome";
}

const STATUS_OPTIONS: Record<string, string> = {
  recebida: "Recebida",
  em_triagem: "Em triagem",
  em_apuracao: "Em apuração",
  concluida: "Concluída",
};

const CRITICIDADE_OPTIONS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

const ACAO_LABEL: Record<string, string> = {
  manifestacao_criada: "Caso criado",
  manifestacao_atualizada: "Status/categoria/criticidade alterados",
  mensagem_registrada: "Mensagem registrada",
  caso_visualizado: "Caso visualizado",
};

type HistoricoItem = { acao: string; detalhe: unknown; created_at: string };

export function CasoPainel({
  tenantSlug,
  tenantId,
  caso,
  categorias,
  mensagens,
  identidade,
  historico,
  anexos,
  notas,
  membros,
}: {
  tenantSlug: string;
  tenantId: string;
  caso: Manifestacao;
  categorias: Categoria[];
  mensagens: Mensagem[];
  identidade: { nome: string | null; email: string | null; telefone: string | null } | null;
  historico: HistoricoItem[];
  anexos: AnexoComUrl[];
  notas: NotaInterna[];
  membros: MembroComEmail[];
}) {
  const action = atualizarCaso.bind(null, tenantSlug, caso.id);
  const [state, formAction, isPending] = useActionState(action, undefined);
  // Mostra o toast quando `state` muda (uma nova resposta da action), sem
  // usar efeito — ajustar estado durante a renderização, comparando com o
  // valor da renderização anterior, é o padrão recomendado pelo React para
  // isso (evita o cascading render que um setState solto em useEffect causa).
  const [toastVisible, setToastVisible] = useState(false);
  const [ultimoState, setUltimoState] = useState(state);
  if (state !== ultimoState) {
    setUltimoState(state);
    if (state?.message) setToastVisible(true);
  }
  const [resposta, setResposta] = useState("");
  const [enviando, startTransition] = useTransition();
  const [erroResposta, setErroResposta] = useState<string | null>(null);
  const [statusSelecionado, setStatusSelecionado] = useState(caso.status);
  const [novaNota, setNovaNota] = useState("");
  const [enviandoNota, startTransitionNota] = useTransition();

  const concluida = caso.status === "concluida";
  const responsavel = membros.find((m) => m.id === caso.atribuido_a);

  const atrasado = estaAtrasado(caso.status, caso.prazo_resposta);

  return (
    <div className="grid md:grid-cols-[1fr_18rem] gap-8">
      <div className="space-y-6">
        {atrasado && (
          <div className="rounded border border-danger bg-danger-soft px-4 py-2 text-sm text-danger font-medium">
            Prazo de resposta vencido em{" "}
            {new Date(caso.prazo_resposta!).toLocaleDateString("pt-BR")}.
          </div>
        )}

        <div className="card">
          <p className="text-xs uppercase tracking-wide text-muted font-mono mb-2">Relato</p>
          <p className="whitespace-pre-wrap">{caso.descricao}</p>
        </div>

        {anexos.length > 0 && (
          <div className="card">
            <p className="text-xs uppercase tracking-wide text-muted font-mono mb-2">
              Evidências anexadas
            </p>
            <ul className="space-y-1">
              {anexos.map((a) => (
                <li key={a.id} className="text-sm">
                  {a.url ? (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      {a.nome}
                    </a>
                  ) : (
                    <span className="text-muted">{a.nome} (indisponível)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-muted font-mono">Mensagens</p>
          {mensagens.length === 0 && (
            <p className="text-sm text-muted">Nenhuma mensagem trocada ainda.</p>
          )}
          {mensagens.map((m) => (
            <div
              key={m.id}
              className={`rounded border p-3 text-sm max-w-lg ${
                m.autor_tipo === "comite"
                  ? "border-accent bg-surface ml-auto"
                  : "border-border bg-background"
              }`}
            >
              <p className="text-xs text-muted mb-1 font-mono">
                {m.autor_tipo === "comite" ? "Comitê" : "Manifestante"} ·{" "}
                {new Date(m.created_at).toLocaleString("pt-BR")}
              </p>
              <p>{m.corpo}</p>
            </div>
          ))}
          {concluida ? (
            <p className="text-sm text-muted bg-background border border-border rounded px-3 py-2 pt-2">
              Caso concluído — não é mais possível trocar mensagens com o manifestante.
            </p>
          ) : (
            <div className="flex gap-2 pt-2">
              <input
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                placeholder="Responder ao manifestante..."
                className="flex-1 rounded border border-border bg-background px-3 py-2"
              />
              <button
                onClick={() =>
                  startTransition(async () => {
                    setErroResposta(null);
                    const r = await responderCaso(tenantSlug, caso.id, tenantId, resposta);
                    if (!r.ok && r.message) {
                      setErroResposta(r.message);
                      return;
                    }
                    setResposta("");
                  })
                }
                disabled={enviando || !resposta.trim()}
                className="rounded bg-accent text-accent-foreground px-4 py-2 font-medium disabled:opacity-60"
              >
                Enviar
              </button>
            </div>
          )}
          {erroResposta && <p className="text-xs text-danger">{erroResposta}</p>}
        </div>

        <div className="rounded-lg border-2 border-dashed border-warn bg-warn-soft p-4 space-y-3">
          <p className="text-xs uppercase tracking-wide text-warn font-mono flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            Notas internas — nunca visíveis ao manifestante
          </p>
          {notas.length === 0 && (
            <p className="text-sm text-muted">Nenhuma nota interna registrada.</p>
          )}
          {notas.map((n) => (
            <div key={n.id} className="rounded border border-border bg-surface p-3 text-sm">
              <p className="text-xs text-muted mb-1 font-mono">
                {new Date(n.created_at).toLocaleString("pt-BR")}
              </p>
              <p>{n.corpo}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={novaNota}
              onChange={(e) => setNovaNota(e.target.value)}
              placeholder="Registrar nota interna do comitê..."
              className="flex-1 rounded border border-border bg-background px-3 py-2"
            />
            <button
              onClick={() =>
                startTransitionNota(async () => {
                  await adicionarNotaInterna(tenantSlug, caso.id, tenantId, novaNota);
                  setNovaNota("");
                })
              }
              disabled={enviandoNota || !novaNota.trim()}
              className="rounded bg-accent text-accent-foreground px-4 py-2 font-medium disabled:opacity-60"
            >
              Registrar
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <form action={formAction} className="card space-y-4">
          <p className="text-xs uppercase tracking-wide text-muted font-mono">Gestão do caso</p>

          <label className="block text-sm">
            <span className="font-medium">
              Status
              <Info texto="Concluída exige um parecer preenchido abaixo. Mudar o status fica registrado no histórico de acesso." />
            </span>
            <select
              key={caso.status}
              name="status"
              defaultValue={caso.status}
              onChange={(e) => setStatusSelecionado(e.target.value as typeof caso.status)}
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
            >
              {Object.entries(STATUS_OPTIONS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          {statusSelecionado === "concluida" && (
            <label className="block text-sm">
              <span className="font-medium">
                Parecer / desfecho
                <Info texto="Uso interno do comitê — o manifestante nunca vê este texto. Registre o que foi apurado e as medidas tomadas, para auditoria e continuidade caso o caso seja revisado depois." />
              </span>
              <textarea
                name="resolucao"
                required
                rows={3}
                defaultValue={caso.resolucao ?? ""}
                placeholder="O que foi apurado e quais medidas foram tomadas — obrigatório para encerrar."
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
              />
            </label>
          )}

          <label className="block text-sm">
            <span className="font-medium">
              Criticidade
              <Info texto="Uso interno do comitê para priorizar a fila de casos — não é visível ao manifestante." />
            </span>
            <select
              name="criticidade"
              defaultValue={caso.criticidade}
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
            >
              {Object.entries(CRITICIDADE_OPTIONS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium">
              Categoria
              <Info texto="Recategorizar recalcula qual prazo de SLA se aplica a partir de agora." />
            </span>
            <select
              name="categoria_id"
              defaultValue={caso.categoria_id ?? ""}
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
            >
              <option value="">Sem categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium">
              Atribuído a
              <Info texto="Quem é o responsável por este caso dentro do time. Some sozinho para quem responder ou anotar primeiro, se ninguém tiver sido atribuído ainda." />
            </span>
            <select
              key={caso.atribuido_a ?? "ninguem"}
              name="atribuido_a"
              defaultValue={caso.atribuido_a ?? ""}
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
            >
              <option value="">Ninguém atribuído</option>
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {nomeMembro(m)} ({ROLE_LABEL[m.role] ?? m.role})
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded bg-accent text-accent-foreground px-4 py-2 font-medium disabled:opacity-60"
          >
            {isPending ? "Salvando..." : "Salvar"}
          </button>
          {state?.error && state.message && (
            <p className="text-xs text-center text-danger">{state.message}</p>
          )}
        </form>

        {toastVisible && state?.message && !state.error && (
          <Toast message={state.message} onDismiss={() => setToastVisible(false)} />
        )}

        <div className="card text-sm space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted font-mono mb-2">
            Manifestante
          </p>
          {caso.identificado ? (
            identidade ? (
              <>
                <p>{identidade.nome ?? "—"}</p>
                <p className="text-muted">{identidade.email ?? "—"}</p>
                <p className="text-muted">{identidade.telefone ?? "—"}</p>
              </>
            ) : (
              <p className="text-muted">Identificado — visível apenas para administradores.</p>
            )
          ) : (
            <p className="text-muted">Anônimo</p>
          )}
          <p className="pt-2 text-xs text-muted">
            Atribuído a: {responsavel ? nomeMembro(responsavel) : "Ninguém"}
          </p>
          <p className="text-xs text-muted">
            Tipo: {caso.tipos_manifestacao?.nome ?? "—"}
          </p>
          <p className="text-xs text-muted">
            Perfil: {PERFIL_LABEL[caso.perfil_manifestante] ?? caso.perfil_manifestante} · Prazo:{" "}
            <span className={atrasado ? "text-danger font-medium" : ""}>
              {caso.prazo_resposta ? new Date(caso.prazo_resposta).toLocaleDateString("pt-BR") : "—"}
            </span>
          </p>
        </div>

        {historico.length > 0 && (
          <div className="card text-sm">
            <p className="text-xs uppercase tracking-wide text-muted font-mono mb-2">
              Histórico de acesso
            </p>
            <ul className="space-y-1.5 max-h-56 overflow-y-auto">
              {historico.map((h, i) => (
                <li key={i} className="text-xs text-muted flex justify-between gap-2">
                  <span>{ACAO_LABEL[h.acao] ?? h.acao}</span>
                  <span className="font-mono whitespace-nowrap">
                    {new Date(h.created_at).toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
