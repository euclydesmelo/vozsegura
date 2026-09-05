"use client";

import { useEffect, useState, useTransition } from "react";
import { consultarManifestacao, enviarMensagemManifestante, type ConsultaResult } from "./actions";
import { STATUS_BADGE_STYLE, STATUS_LABEL } from "@/lib/status";

const ETAPAS = ["recebida", "em_triagem", "em_apuracao", "concluida"] as const;

function EtapaStatus({ status }: { status: string }) {
  const indiceAtual = ETAPAS.indexOf(status as (typeof ETAPAS)[number]);
  return (
    <div className="flex items-start">
      {ETAPAS.map((etapa, i) => (
        <div key={etapa} className={`flex flex-col items-center ${i < ETAPAS.length - 1 ? "flex-1" : ""}`}>
          <div className="flex items-center w-full">
            <div
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                i <= indiceAtual ? "bg-accent" : "bg-border"
              }`}
            />
            {i < ETAPAS.length - 1 && (
              <div className={`flex-1 h-px ${i < indiceAtual ? "bg-accent/40" : "bg-border"}`} />
            )}
          </div>
          <p
            className={`text-[10.5px] mt-1.5 text-center ${
              i === indiceAtual ? "text-accent font-semibold" : "text-muted"
            }`}
          >
            {STATUS_LABEL[etapa]}
          </p>
        </div>
      ))}
    </div>
  );
}

// Guarda protocolo/código no fragmento da URL (depois do #), nunca em
// querystring — o fragmento não é enviado ao servidor (não vaza para logs
// de acesso nem para o cabeçalho Referer), mas sobrevive a um F5 porque o
// navegador mantém a URL completa. Só o próprio navegador do manifestante
// lê esse valor.
function lerHash(): { protocolo: string; codigo: string } | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const protocolo = params.get("protocolo");
  const codigo = params.get("codigo");
  return protocolo && codigo ? { protocolo, codigo } : null;
}

function gravarHash(protocolo: string, codigo: string) {
  const params = new URLSearchParams({ protocolo, codigo });
  window.history.replaceState(null, "", `#${params.toString()}`);
}

export function ConsultaClient({ tenantSlug }: { tenantSlug: string }) {
  const [protocolo, setProtocolo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [resultado, setResultado] = useState<ConsultaResult | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [restaurandoHash, setRestaurandoHash] = useState(false);
  const [isPending, startTransition] = useTransition();

  function buscar(protocoloBusca: string, codigoBusca: string) {
    setErro(null);
    startTransition(async () => {
      const r = await consultarManifestacao(tenantSlug, protocoloBusca, codigoBusca);
      if (!r.ok) {
        setErro(r.message);
        setResultado(null);
        return;
      }
      setResultado(r);
      gravarHash(protocoloBusca, codigoBusca);
    });
  }

  // Ao carregar a página (inclusive um F5), restaura a consulta a partir do
  // fragmento da URL em vez de sempre voltar para o formulário em branco.
  // Todo setState fica dentro do callback assíncrono (não solto no corpo do
  // efeito) para não disparar renders em cascata.
  useEffect(() => {
    const salvo = lerHash();
    if (!salvo) return;
    startTransition(async () => {
      setRestaurandoHash(true);
      setProtocolo(salvo.protocolo);
      setCodigo(salvo.codigo);
      const r = await consultarManifestacao(tenantSlug, salvo.protocolo, salvo.codigo);
      if (!r.ok) {
        setErro(r.message);
        return;
      }
      setResultado(r);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enviar() {
    if (!novaMensagem.trim()) return;
    startTransition(async () => {
      const r = await enviarMensagemManifestante(tenantSlug, protocolo, codigo, novaMensagem);
      if (!r.ok) {
        setErro(r.message);
        return;
      }
      setResultado(r);
      setNovaMensagem("");
    });
  }

  if (restaurandoHash && isPending && !resultado) {
    return <p className="text-sm text-muted">Carregando sua consulta...</p>;
  }

  if (resultado?.ok) {
    const concluida = resultado.status === "concluida";
    return (
      <div className="space-y-6">
        <div className="card space-y-3 text-sm">
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <div>
              <span className="text-muted">Protocolo </span>
              <span className="font-mono">{resultado.protocolo}</span>
            </div>
            <div>
              <span className="text-muted">Status </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE_STYLE[resultado.status]}`}>
                {resultado.statusLabel}
              </span>
            </div>
            {resultado.categoriaNome && (
              <div>
                <span className="text-muted">Categoria </span>
                <span>{resultado.categoriaNome}</span>
              </div>
            )}
          </div>
          <EtapaStatus status={resultado.status} />
        </div>

        {resultado.anexos.length > 0 && (
          <div className="card">
            <p className="text-xs uppercase tracking-wide text-muted font-mono mb-2">
              Evidências anexadas
            </p>
            <ul className="space-y-1">
              {resultado.anexos.map((a) => (
                <li key={a.id} className="text-sm">
                  {a.url ? (
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
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
          {resultado.mensagens.length === 0 && (
            <p className="text-sm text-muted">Nenhuma mensagem trocada ainda.</p>
          )}
          {resultado.mensagens.map((m) => (
            <div
              key={m.id}
              className={`rounded border p-3 text-sm max-w-lg ${
                m.autor_tipo === "manifestante"
                  ? "border-accent bg-surface ml-auto"
                  : "border-border bg-background"
              }`}
            >
              <p className="text-xs text-muted mb-1 font-mono">
                {m.autor_tipo === "manifestante" ? "Você" : "Comitê"} ·{" "}
                {new Date(m.created_at).toLocaleString("pt-BR")}
              </p>
              <p>{m.corpo}</p>
            </div>
          ))}
        </div>

        {concluida ? (
          <p className="text-sm text-muted bg-background border border-border rounded px-3 py-2">
            Este caso foi concluído e não aceita mais novas mensagens. Se surgir algo novo,
            registre uma nova manifestação.
          </p>
        ) : (
          <div className="flex gap-2">
            <input
              value={novaMensagem}
              onChange={(e) => setNovaMensagem(e.target.value)}
              placeholder="Responder ao comitê..."
              className="flex-1 rounded border border-border bg-background px-3 py-2"
            />
            <button
              onClick={enviar}
              disabled={isPending}
              className="rounded bg-accent text-accent-foreground px-4 py-2 font-medium disabled:opacity-60"
            >
              Enviar
            </button>
          </div>
        )}
        {erro && <p className="text-sm text-danger">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-sm">
      <label className="block">
        <span className="text-sm font-medium">Protocolo</span>
        <input
          value={protocolo}
          onChange={(e) => setProtocolo(e.target.value)}
          placeholder="OUV-XXXXXXXX"
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Código de acesso</span>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="XXXX-XXXX-XXXX"
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono"
        />
      </label>
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <button
        onClick={() => buscar(protocolo, codigo)}
        disabled={isPending}
        className="rounded bg-accent text-accent-foreground px-5 py-2.5 font-medium disabled:opacity-60"
      >
        {isPending ? "Consultando..." : "Consultar"}
      </button>
    </div>
  );
}
