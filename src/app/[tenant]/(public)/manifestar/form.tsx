"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  MAX_ANEXOS_POR_ENVIO,
  TIPOS_ARQUIVO_ACEITOS,
  type Categoria,
  type TipoManifestacao,
} from "@/lib/supabase/types";
import { Info } from "@/components/Info";
import { CopyButton } from "@/components/CopyButton";
import { PERFIL_LABEL } from "@/lib/perfil";
import type { ManifestarState } from "./actions";

const initialState: ManifestarState = { status: "idle" };

function IconTag() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 3h6a2 2 0 0 1 2 2v6L10.5 19.5a2 2 0 0 1-2.8 0l-4.7-4.7a2 2 0 0 1 0-2.8L11 3z" />
      <circle cx="15.5" cy="8.5" r="1.3" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.7 14.3c2.1.4 3.8 2 3.8 4.7" />
    </svg>
  );
}

function IconPaperclip() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 11.5l-7.5 7.5a4 4 0 0 1-5.7-5.7l8-8a2.7 2.7 0 0 1 3.8 3.8l-7.6 7.6a1.3 1.3 0 0 1-1.9-1.9l6.9-6.9" />
    </svg>
  );
}

function SectionHead({ icon, titulo, opcional }: { icon: React.ReactNode; titulo: string; opcional?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-4 text-accent">
      {icon}
      <span className="font-serif font-semibold text-sm text-foreground">{titulo}</span>
      {opcional && (
        <span className="ml-auto text-[10.5px] font-medium text-accent bg-accent-soft px-2 py-0.5 rounded-full">
          Opcional
        </span>
      )}
    </div>
  );
}

export function ManifestarForm({
  action,
  categorias,
  tipos,
  cipaEnabled,
  tenantSlug,
}: {
  action: (state: ManifestarState, formData: FormData) => Promise<ManifestarState>;
  categorias: Categoria[];
  tipos: TipoManifestacao[];
  cipaEnabled: boolean;
  tenantSlug: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [identificado, setIdentificado] = useState(false);
  const [arquivos, setArquivos] = useState<string[]>([]);

  if (state.status === "success") {
    return (
      <div className="rounded border border-accent bg-surface p-6 space-y-4" style={{ boxShadow: "var(--shadow-popover)" }}>
        <p className="font-semibold text-accent">Manifestação registrada.</p>
        <p className="text-sm text-muted">
          Guarde o protocolo e o código de acesso abaixo — eles aparecem uma única vez e são a
          única forma de acompanhar sua manifestação, com ou sem identificação.
        </p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded border border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <dt className="text-xs uppercase tracking-wide text-muted font-mono">Protocolo</dt>
              <CopyButton valor={state.protocolo!} />
            </div>
            <dd className="font-mono text-lg">{state.protocolo}</dd>
          </div>
          <div
            className="rounded p-4"
            style={{ background: "rgba(142,106,44,0.07)", border: "1px solid rgba(142,106,44,0.4)" }}
          >
            <div className="flex items-center justify-between">
              <dt className="text-xs uppercase tracking-wide text-brass font-mono">
                Código de acesso
              </dt>
              <CopyButton valor={state.codigo!} className="text-brass" />
            </div>
            <dd className="font-mono text-lg text-brass">{state.codigo}</dd>
          </div>
        </dl>
        <div className="flex items-center justify-between rounded border border-danger bg-danger-soft px-3 py-2">
          <p className="text-sm text-danger font-medium">
            Não é possível recuperar o código de acesso depois — anote-o agora.
          </p>
          <CopyButton
            valor={`Protocolo: ${state.protocolo}\nCódigo de acesso: ${state.codigo}`}
            className="text-danger shrink-0 ml-3"
          />
        </div>
        {state.identificado ? (
          <p className="text-sm text-muted">
            Você se identificou, então o comitê pode entrar em contato diretamente. Ainda assim,
            guarde o protocolo: é a forma mais rápida de acompanhar o andamento.
          </p>
        ) : (
          <p className="text-sm text-muted">
            Como você optou por não se identificar, este protocolo e código são a{" "}
            <strong>única</strong> forma de acompanhar sua manifestação — não há e-mail vinculado
            e ninguém pode gerar um novo código em seu lugar caso você os perca.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {cipaEnabled && (
        <div className="rounded border border-warn bg-warn-soft p-4 text-sm">
          <p className="font-semibold text-warn">Denúncias de assédio (Lei 14.457/2022)</p>
          <p className="text-muted mt-1">
            O anonimato é garantido por lei. Você não precisa se identificar para relatar
            assédio moral, sexual ou outras formas de violência.
          </p>
        </div>
      )}

      {state.status === "error" && state.message && (
        <p className="text-sm text-danger">{state.message}</p>
      )}

      <div className="card">
        <SectionHead icon={<IconTag />} titulo="Sobre a manifestação" />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <label className="block">
            <span className="text-sm font-medium">Tipo de manifestação</span>
            <select
              name="tipo_id"
              required
              className="field-input mt-1"
            >
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium">
              Você é
              <Info texto="Ajuda o comitê a entender o contexto — não afeta o anonimato da sua manifestação." />
            </span>
            <select
              name="perfil_manifestante"
              required
              className="field-input mt-1"
            >
              {Object.entries(PERFIL_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block mb-4">
          <span className="text-sm font-medium">
            Categoria (opcional)
            <Info texto="Define o prazo de resposta esperado. Sem categoria, vale o prazo padrão do canal." />
          </span>
          <select
            name="categoria_id"
            className="field-input mt-1"
            defaultValue=""
          >
            <option value="">Prefiro não categorizar</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Descreva a manifestação</span>
          <textarea
            name="descricao"
            required
            minLength={20}
            rows={6}
            className="field-input mt-1"
            placeholder="Conte o que aconteceu, quando e quem esteve envolvido, com o máximo de detalhes possível."
          />
          {state.fieldErrors?.descricao ? (
            <span className="text-xs text-danger">{state.fieldErrors.descricao}</span>
          ) : (
            <span className="text-xs text-muted">Mínimo de 20 caracteres.</span>
          )}
        </label>
      </div>

      <div className="card">
        <SectionHead icon={<IconUsers />} titulo="Identificação" opcional />
        <label className="flex items-center gap-2 text-sm font-medium mb-3">
          <input
            type="checkbox"
            name="identificado"
            checked={identificado}
            onChange={(e) => setIdentificado(e.target.checked)}
          />
          Quero me identificar
          <Info texto="Opcional. Se marcar, só o administrador do canal vê seu nome e contato — nunca todo o comitê." />
        </label>
        {identificado && (
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            <input name="nome" placeholder="Nome" className="field-input" />
            <input name="email" placeholder="E-mail" className="field-input" />
            <input name="telefone" placeholder="Telefone" className="field-input" />
          </div>
        )}
        <p className="text-xs text-muted">
          Sua identidade fica visível apenas para o administrador do canal, nunca para todo o
          comitê.
        </p>
      </div>

      <div className="card">
        <SectionHead icon={<IconPaperclip />} titulo="Evidências" opcional />
        <label className="block cursor-pointer">
          <div className="border border-dashed border-border rounded-md py-6 flex flex-col items-center text-muted hover:border-accent transition-colors">
            <IconPaperclip />
            <p className="text-sm mt-1.5">Clique para selecionar arquivos</p>
            <p className="text-xs mt-0.5">
              Até {MAX_ANEXOS_POR_ENVIO} arquivos, 10MB cada — imagens, PDF ou Word.
            </p>
          </div>
          <input
            type="file"
            name="anexos"
            multiple
            accept={TIPOS_ARQUIVO_ACEITOS}
            className="sr-only"
            onChange={(e) => setArquivos(Array.from(e.target.files ?? []).map((f) => f.name))}
          />
        </label>
        {arquivos.length > 0 && (
          <ul className="mt-3 space-y-1">
            {arquivos.map((nome) => (
              <li key={nome} className="text-xs text-foreground flex items-center gap-1.5">
                <IconPaperclip />
                {nome}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted">
        Ao enviar, seus dados são tratados conforme a{" "}
        <Link href={`/${tenantSlug}/privacidade`} className="text-accent hover:underline">
          Política de Privacidade
        </Link>{" "}
        deste canal.
      </p>

      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? "Enviando..." : "Enviar manifestação"}
      </button>
    </form>
  );
}
