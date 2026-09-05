"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  comite: "Comitê",
  leitor: "Leitor",
};

function iniciais(nome: string | null, email: string) {
  const base = nome?.trim() || email;
  const partes = base.split(/[\s@.]+/).filter(Boolean);
  return (partes[0]?.[0] ?? "").concat(partes[1]?.[0] ?? "").toUpperCase() || "?";
}

export function ProfileMenu({
  tenantSlug,
  nome,
  email,
  role,
}: {
  tenantSlug: string;
  nome: string | null;
  email: string;
  role: string;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((v) => !v)}
        aria-label="Abrir menu de perfil"
        aria-expanded={aberto}
        className="w-8 h-8 rounded-full bg-accent text-accent-foreground text-xs font-semibold flex items-center justify-center hover:opacity-90"
      >
        {iniciais(nome, email)}
      </button>

      {aberto && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded border border-border bg-surface p-4 z-30 space-y-3"
          style={{ boxShadow: "var(--shadow-popover)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent text-accent-foreground text-sm font-semibold flex items-center justify-center flex-none">
              {iniciais(nome, email)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{nome ?? email}</p>
              {nome && <p className="text-xs text-muted truncate">{email}</p>}
              <p className="text-xs text-muted font-mono uppercase">{ROLE_LABEL[role] ?? role}</p>
            </div>
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <Link
              href={`/${tenantSlug}/manual`}
              target="_blank"
              className="block text-sm text-accent hover:underline"
              onClick={() => setAberto(false)}
            >
              Manual de uso
            </Link>
            <button
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                router.push(`/${tenantSlug}/admin/login`);
                router.refresh();
              }}
              className="text-sm text-danger hover:underline"
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
