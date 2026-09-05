"use client";

import { useActionState, useState, useTransition } from "react";
import type { TipoManifestacao } from "@/lib/supabase/types";
import { Tooltip } from "@/components/Info";
import { alternarAtivoTipo, atualizarTipo, criarTipo, type TipoState } from "./actions";

function TipoRow({ tenantSlug, tipo }: { tenantSlug: string; tipo: TipoManifestacao }) {
  const [editando, setEditando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const action = atualizarTipo.bind(null, tenantSlug, tipo.id);
  const [state, formAction, isSaving] = useActionState<TipoState | undefined, FormData>(
    action,
    undefined
  );

  if (editando) {
    return (
      <li className="py-2.5">
        <form
          action={async (fd) => {
            await formAction(fd);
            setEditando(false);
          }}
          className="grid sm:grid-cols-[2fr_3fr_auto] gap-2 items-start"
        >
          <input
            name="nome"
            defaultValue={tipo.nome}
            required
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
          <input
            name="descricao"
            defaultValue={tipo.descricao ?? ""}
            placeholder="Descrição (opcional)"
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-accent text-accent-foreground px-3 py-1.5 text-sm font-medium"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="rounded border border-border px-3 py-1.5 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
        {state?.message && (
          <p className={`text-xs mt-1 ${state.error ? "text-danger" : "text-muted"}`}>
            {state.message}
          </p>
        )}
      </li>
    );
  }

  return (
    <li className={`py-2.5 flex items-center justify-between gap-3 ${!tipo.ativo ? "opacity-50" : ""}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{tipo.nome}</p>
        {tipo.descricao && <p className="text-xs text-muted truncate">{tipo.descricao}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            tipo.ativo ? "bg-accent-soft text-accent" : "bg-border text-muted"
          }`}
        >
          {tipo.ativo ? "Ativo" : "Inativo"}
        </span>
        <button onClick={() => setEditando(true)} className="text-sm text-accent hover:underline">
          Editar
        </button>
        <Tooltip
          texto={
            tipo.ativo
              ? "Some do formulário público, mas casos antigos continuam referenciando este tipo — nunca é excluído de verdade."
              : "Volta a aparecer no formulário público."
          }
        >
          <button
            disabled={isPending}
            onClick={() => startTransition(() => alternarAtivoTipo(tenantSlug, tipo.id, !tipo.ativo))}
            className="text-sm text-muted hover:text-danger"
          >
            {tipo.ativo ? "Inativar" : "Reativar"}
          </button>
        </Tooltip>
      </div>
    </li>
  );
}

function NovoTipoForm({ tenantSlug, tenantId }: { tenantSlug: string; tenantId: string }) {
  const action = criarTipo.bind(null, tenantSlug, tenantId);
  const [state, formAction, isPending] = useActionState<TipoState | undefined, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="grid sm:grid-cols-[2fr_3fr_auto] gap-2 items-start pt-3">
      <input
        name="nome"
        placeholder="Nome do tipo"
        required
        className="rounded border border-border bg-background px-2 py-1.5 text-sm"
      />
      <input
        name="descricao"
        placeholder="Descrição (opcional)"
        className="rounded border border-border bg-background px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-accent text-accent-foreground px-3 py-1.5 text-sm font-medium disabled:opacity-60"
      >
        Adicionar
      </button>
      {state?.message && (
        <p className={`text-xs sm:col-span-3 ${state.error ? "text-danger" : "text-muted"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}

export function TiposPainel({
  tenantSlug,
  tenantId,
  tipos,
}: {
  tenantSlug: string;
  tenantId: string;
  tipos: TipoManifestacao[];
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-1.5">
        <p className="font-medium">Tipos de manifestação</p>
        <Tooltip texto="Cadastro que aparece no formulário público (Denúncia, Reclamação, Sugestão...). Nunca são excluídos — apenas inativados, e continuam associados aos casos antigos que já os usaram.">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-border text-[10px] leading-none text-muted select-none">
            ?
          </span>
        </Tooltip>
      </div>

      <ul className="divide-y divide-border mt-2">
        {tipos.map((t) => (
          <TipoRow key={t.id} tenantSlug={tenantSlug} tipo={t} />
        ))}
        {tipos.length === 0 && <li className="py-3 text-sm text-muted">Nenhum tipo cadastrado.</li>}
      </ul>

      <NovoTipoForm tenantSlug={tenantSlug} tenantId={tenantId} />
    </div>
  );
}
