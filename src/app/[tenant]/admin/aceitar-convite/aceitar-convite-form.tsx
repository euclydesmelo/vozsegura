"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function AceitarConviteForm({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) {
      setErro("Não foi possível definir a senha. Use pelo menos 6 caracteres.");
      return;
    }
    router.push(`/${tenantSlug}/admin`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Defina sua senha</span>
        <input
          type="password"
          required
          minLength={6}
          autoFocus
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="field-input mt-1"
        />
      </label>
      {erro && (
        <p className="text-sm text-danger bg-danger-soft border border-danger rounded px-3 py-2">
          {erro}
        </p>
      )}
      <button type="submit" disabled={carregando} className="btn-primary w-full">
        {carregando ? "Salvando..." : "Entrar no painel"}
      </button>
    </form>
  );
}
