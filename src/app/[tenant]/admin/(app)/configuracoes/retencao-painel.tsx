"use client";

import { useState, useTransition } from "react";
import { anonimizarDadosExpirados } from "./actions";

export function RetencaoPainel({
  tenantSlug,
  tenantId,
  contagemInicial,
}: {
  tenantSlug: string;
  tenantId: string;
  contagemInicial: number;
}) {
  const [contagem, setContagem] = useState(contagemInicial);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card space-y-3">
      <div>
        <p className="font-medium">Dados pessoais elegíveis para eliminação</p>
        <p className="text-sm text-muted mt-0.5">
          Casos concluídos há mais tempo do que o prazo de retenção configurado acima. A
          eliminação remove nome/e-mail/telefone do manifestante identificado — o caso em si
          (protocolo, categoria, parecer) é mantido para fins estatísticos.
        </p>
      </div>
      <p className="text-2xl font-serif font-semibold">{contagem}</p>
      <button
        disabled={isPending || contagem === 0}
        onClick={() =>
          startTransition(async () => {
            const { removidos } = await anonimizarDadosExpirados(tenantSlug, tenantId);
            setContagem(0);
            setMensagem(`${removidos} registro(s) de identidade anonimizado(s).`);
          })
        }
        className="rounded border border-danger text-danger px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Anonimizando..." : "Anonimizar agora"}
      </button>
      {mensagem && <p className="text-xs text-muted">{mensagem}</p>}
    </div>
  );
}
