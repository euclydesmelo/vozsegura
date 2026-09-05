"use client";

import { useActionState } from "react";
import { Tooltip } from "@/components/Info";
import { criarCategoria, type CategoriaState } from "./actions";

export function NovaCategoriaForm({ tenantSlug, tenantId }: { tenantSlug: string; tenantId: string }) {
  const action = criarCategoria.bind(null, tenantSlug, tenantId);
  const [state, formAction, isPending] = useActionState<CategoriaState | undefined, FormData>(
    action,
    undefined
  );

  return (
    <form
      action={formAction}
      className="card grid sm:grid-cols-[2fr_3fr_6rem_auto] gap-2 items-start mb-6"
    >
      <input
        name="nome"
        placeholder="Nome da categoria"
        required
        className="rounded border border-border bg-background px-2 py-1.5 text-sm"
      />
      <input
        name="descricao"
        placeholder="Descrição (opcional)"
        className="rounded border border-border bg-background px-2 py-1.5 text-sm"
      />
      <Tooltip
        texto="Prazo de resposta em horas para manifestações desta categoria (ex.: 240 = 10 dias)."
        className="w-full"
      >
        <input
          name="sla_horas"
          type="number"
          min={1}
          defaultValue={240}
          required
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
        />
      </Tooltip>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-accent text-accent-foreground px-3 py-1.5 text-sm font-medium disabled:opacity-60"
      >
        Adicionar
      </button>
      {state?.message && (
        <p className={`text-xs sm:col-span-4 ${state.error ? "text-danger" : "text-muted"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
