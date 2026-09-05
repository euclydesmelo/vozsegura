"use client";

import { useState } from "react";

export function CopyButton({ valor, className }: { valor: string; className?: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard indisponível (ex.: contexto não seguro) — usuário ainda
      // pode selecionar e copiar manualmente o texto já visível ao lado.
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className={`text-xs font-medium hover:underline whitespace-nowrap ${className ?? "text-accent"}`}
    >
      {copiado ? "Copiado!" : "Copiar"}
    </button>
  );
}
