"use client";

import { useActionState } from "react";
import { Info } from "@/components/Info";
import { convidarMembro, type MembroState } from "./actions";

const PAPEIS: Record<string, string> = {
  admin: "Administrador",
  comite: "Comitê",
  leitor: "Leitor",
};

export function ConvidarForm({ tenantSlug, tenantId }: { tenantSlug: string; tenantId: string }) {
  const action = convidarMembro.bind(null, tenantSlug, tenantId);
  const [state, formAction, isPending] = useActionState<MembroState | undefined, FormData>(
    action,
    undefined
  );

  return (
    <form
      action={formAction}
      className="card grid sm:grid-cols-[1.5fr_2fr_1fr_auto] gap-2 items-start"
    >
      <input
        name="nome"
        required
        placeholder="Nome"
        className="rounded border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="e-mail@empresa.com.br"
        className="rounded border border-border bg-background px-3 py-2 text-sm"
      />
      <label className="sr-only" htmlFor="convite-role">
        Papel
      </label>
      <select
        id="convite-role"
        name="role"
        title="Admin gerencia categorias, usuários e configurações; Comitê trata casos; Leitor só visualiza."
        className="rounded border border-border bg-background px-3 py-2 text-sm"
        defaultValue="comite"
      >
        {Object.entries(PAPEIS).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-accent text-accent-foreground px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Enviando..." : "Convidar"}
      </button>
      <p className="text-xs text-muted sm:col-span-4 -mt-1">
        Se o e-mail já tem acesso a outro canal, só vinculamos ao seu; senão enviamos um convite
        por e-mail
        <Info texto="O convite pede para a pessoa definir uma senha antes de entrar no painel." />
        .
      </p>
      {state?.message && (
        <p className={`text-xs sm:col-span-4 ${state.error ? "text-danger" : "text-muted"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
