"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function LoginForm({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(
    searchParams.get("erro") === "sem-acesso"
      ? "Este usuário não tem acesso ao canal desta empresa."
      : searchParams.get("erro") === "convite-invalido"
        ? "Este convite não é mais válido — peça para o administrador enviar um novo."
        : null
  );
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      setErro("E-mail ou senha inválidos.");
      return;
    }
    router.push(`/${tenantSlug}/admin`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">E-mail</span>
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field-input mt-1"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Senha</span>
        <input
          type="password"
          required
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
        {carregando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
