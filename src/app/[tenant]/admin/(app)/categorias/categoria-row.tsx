"use client";

import { useActionState, useState, useTransition } from "react";
import type { Categoria } from "@/lib/supabase/types";
import { formatarSlaHoras } from "@/lib/sla";
import { Tooltip } from "@/components/Info";
import { alternarAtivoCategoria, atualizarCategoria, type CategoriaState } from "./actions";

export function CategoriaRow({
  tenantSlug,
  categoria,
}: {
  tenantSlug: string;
  categoria: Categoria;
}) {
  const [editando, setEditando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const action = atualizarCategoria.bind(null, tenantSlug, categoria.id);
  const [state, formAction, isSaving] = useActionState<CategoriaState | undefined, FormData>(
    action,
    undefined
  );

  if (editando) {
    return (
      <tr className="border-t border-border bg-surface">
        <td colSpan={4} className="px-4 py-4">
          <form
            action={async (fd) => {
              await formAction(fd);
              setEditando(false);
            }}
            className="grid sm:grid-cols-[2fr_3fr_6rem_auto] gap-2 items-start"
          >
            <input
              name="nome"
              defaultValue={categoria.nome}
              required
              className="rounded border border-border bg-background px-2 py-1.5 text-sm"
            />
            <input
              name="descricao"
              defaultValue={categoria.descricao ?? ""}
              placeholder="Descrição"
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
                defaultValue={categoria.sla_horas}
                required
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              />
            </Tooltip>
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
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-t border-border ${!categoria.ativo ? "opacity-50" : ""}`}>
      <td className="px-4 py-3">
        <p className="font-medium">{categoria.nome}</p>
        {categoria.descricao && <p className="text-xs text-muted">{categoria.descricao}</p>}
      </td>
      <td className="px-4 py-3 text-muted font-mono text-xs">{formatarSlaHoras(categoria.sla_horas)}</td>
      <td className="px-4 py-3">
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            categoria.ativo ? "bg-accent/10 text-accent" : "bg-border text-muted"
          }`}
        >
          {categoria.ativo ? "Ativa" : "Inativa"}
        </span>
      </td>
      <td className="px-4 py-3 text-right space-x-3">
        <button onClick={() => setEditando(true)} className="text-sm text-accent hover:underline">
          Editar
        </button>
        <Tooltip
          texto={
            categoria.ativo
              ? "Some do formulário público, mas casos antigos continuam referenciando esta categoria — nunca é excluída de verdade."
              : "Volta a aparecer no formulário público."
          }
        >
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(() => alternarAtivoCategoria(tenantSlug, categoria.id, !categoria.ativo))
            }
            className="text-sm text-muted hover:text-danger"
          >
            {categoria.ativo ? "Inativar" : "Reativar"}
          </button>
        </Tooltip>
      </td>
    </tr>
  );
}
