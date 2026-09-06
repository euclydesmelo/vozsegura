"use client";

import { useActionState, useState } from "react";
import { Info } from "@/components/Info";
import { CopyButton } from "@/components/CopyButton";
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
  const [modo, setModo] = useState<"convite" | "senha_temporaria">("convite");

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-1 text-sm font-medium">
        Como dar acesso
        <Info texto="Escolha um dos dois — nunca os dois ao mesmo tempo. Convite depende do e-mail chegar; senha temporária funciona na hora, mas você precisa repassá-la por um canal seguro." />
      </div>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="modo-ui"
            checked={modo === "convite"}
            onChange={() => setModo("convite")}
          />
          Convite por e-mail
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="modo-ui"
            checked={modo === "senha_temporaria"}
            onChange={() => setModo("senha_temporaria")}
          />
          Senha temporária
        </label>
      </div>

      <form
        action={formAction}
        className="grid sm:grid-cols-[1.5fr_2fr_1fr_auto] gap-2 items-start"
      >
        <input type="hidden" name="modo" value={modo} />
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
          {isPending ? "Enviando..." : modo === "convite" ? "Convidar" : "Criar"}
        </button>
        <p className="text-xs text-muted sm:col-span-4 -mt-1">
          {modo === "convite"
            ? "Se o e-mail já tem acesso a outro canal, só vinculamos ao seu; senão enviamos um convite por e-mail para a pessoa definir a própria senha."
            : "Gera uma senha temporária na hora — a pessoa é obrigada a trocá-la no primeiro login. Não envia e-mail nenhum."}
        </p>
        {state?.message && !state.senhaTemporaria && (
          <p className={`text-xs sm:col-span-4 ${state.error ? "text-danger" : "text-muted"}`}>
            {state.message}
          </p>
        )}
      </form>

      {state?.senhaTemporaria && (
        <div className="rounded border border-brass bg-background p-3 sm:col-span-4" style={{ background: "rgba(142,106,44,0.07)" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-brass">Senha temporária — só aparece agora</p>
            <CopyButton valor={state.senhaTemporaria} className="text-brass" />
          </div>
          <p className="font-mono text-lg text-brass">{state.senhaTemporaria}</p>
          <p className="text-xs text-muted mt-1">
            Repasse por um canal seguro (telefone, presencial). A pessoa será obrigada a trocá-la
            no primeiro login.
          </p>
        </div>
      )}
    </div>
  );
}
