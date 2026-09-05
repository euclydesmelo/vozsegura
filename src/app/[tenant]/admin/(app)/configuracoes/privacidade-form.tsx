"use client";

import { useActionState } from "react";
import type { Tenant } from "@/lib/supabase/types";
import { Info } from "@/components/Info";
import { atualizarPrivacidade } from "./actions";

export function PrivacidadeForm({ tenantSlug, tenant }: { tenantSlug: string; tenant: Tenant }) {
  const action = atualizarPrivacidade.bind(null, tenantSlug);
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="card space-y-4">
      <div>
        <p className="font-medium">Dados gerais do canal</p>
        <p className="text-sm text-muted mt-0.5">
          Encarregado e retenção aparecem na página pública de Política de Privacidade (LGPD art.
          41). O prazo padrão vale para manifestações sem categoria selecionada.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="font-medium">
            Nome do encarregado
            <Info texto="Pessoa responsável por atender pedidos de titulares de dados (LGPD art. 41). Aparece na página pública de privacidade." />
          </span>
          <input
            name="dpo_nome"
            defaultValue={tenant.dpo_nome ?? ""}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">E-mail do encarregado</span>
          <input
            name="dpo_email"
            type="email"
            defaultValue={tenant.dpo_email ?? ""}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
          />
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="font-medium">
            Retenção de casos concluídos (dias)
            <Info texto="Depois desse prazo, o caso passa a aparecer como elegível para anonimização na seção abaixo — a eliminação continua manual." />
          </span>
          <input
            name="retencao_dias"
            type="number"
            min={30}
            defaultValue={tenant.retencao_dias}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">
            Prazo de resposta padrão (dias)
            <Info texto="Usado quando o manifestante não escolhe uma categoria no formulário público. Cada categoria pode ter seu próprio prazo em /admin/categorias." />
          </span>
          <input
            name="sla_padrao_dias"
            type="number"
            min={1}
            defaultValue={tenant.sla_padrao_dias}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-accent text-accent-foreground px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar"}
      </button>
      {state?.message && (
        <p className={`text-xs ${state.error ? "text-danger" : "text-muted"}`}>{state.message}</p>
      )}
    </form>
  );
}
