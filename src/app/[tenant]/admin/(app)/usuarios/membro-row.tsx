"use client";

import { useState, useTransition } from "react";
import type { TenantRole } from "@/lib/supabase/types";
import type { MembroComEmail } from "@/lib/tenantMembers";
import { atualizarPapelMembro, removerMembro } from "./actions";

const PAPEIS: Record<string, string> = {
  admin: "Administrador",
  comite: "Comitê",
  leitor: "Leitor",
};

export function MembroRow({
  tenantSlug,
  tenantId,
  membro,
  ultimoAdmin,
}: {
  tenantSlug: string;
  tenantId: string;
  membro: MembroComEmail;
  ultimoAdmin: boolean;
}) {
  const [papel, setPapel] = useState<TenantRole>(membro.role);
  const [aviso, setAviso] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3">
        {membro.nome ?? "—"}
        {membro.deve_trocar_senha && (
          <span
            title="Ainda não trocou a senha temporária definida na criação."
            className="ml-1.5 text-[10px] font-medium text-brass bg-brass/10 px-1.5 py-0.5 rounded"
          >
            senha pendente
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-muted">{membro.email ?? "—"}</td>
      <td className="px-4 py-3">
        <select
          value={papel}
          disabled={isPending}
          onChange={(e) => {
            const novoPapel = e.target.value as TenantRole;
            setPapel(novoPapel);
            startTransition(async () => {
              const r = await atualizarPapelMembro(tenantSlug, tenantId, membro.id, novoPapel);
              if (r.message) {
                setAviso(r.message);
                setPapel(membro.role);
              } else {
                setAviso(null);
              }
            });
          }}
          className="rounded border border-border bg-background px-2 py-1 text-sm"
        >
          {Object.entries(PAPEIS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        {aviso && <p className="text-xs text-danger mt-1">{aviso}</p>}
      </td>
      <td className="px-4 py-3 text-muted">
        {new Date(membro.created_at).toLocaleDateString("pt-BR")}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          disabled={isPending || ultimoAdmin}
          title={ultimoAdmin ? "Precisa haver ao menos um administrador" : undefined}
          onClick={() =>
            startTransition(async () => {
              const r = await removerMembro(tenantSlug, tenantId, membro.id);
              if (r.message) setAviso(r.message);
            })
          }
          className="text-sm text-muted hover:text-danger disabled:opacity-40 disabled:hover:text-muted"
        >
          Remover
        </button>
      </td>
    </tr>
  );
}
