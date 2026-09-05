"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Popover explicativo — aparece ao passar o mouse, ao focar (teclado) e
 * alterna ao clicar/tocar (necessário em telas sensíveis ao toque, onde não
 * existe "hover"). Uma vez fixado por clique, sobrevive ao mouse saindo de
 * cima (só fecha ao clicar fora ou apertar Esc) — sem isso, o tooltip fecha
 * antes de dar tempo de ler. Use para "envolver" qualquer elemento que
 * precise de uma explicação extra: um selo "?", um link, um botão. */
export function Tooltip({
  texto,
  children,
  className,
}: {
  texto: string;
  children: ReactNode;
  className?: string;
}) {
  const [hover, setHover] = useState(false);
  const [fixado, setFixado] = useState(false);
  const aberto = hover || fixado;
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!fixado) return;
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setFixado(false);
    }
    function aoPressionarEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setFixado(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoPressionarEsc);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoPressionarEsc);
    };
  }, [fixado]);

  return (
    <span
      ref={ref}
      className={`relative inline-flex ${className ?? ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      onBlurCapture={() => setHover(false)}
      onClickCapture={() => setFixado((v) => !v)}
    >
      {children}
      {aberto && (
        <span
          role="tooltip"
          className="pointer-events-none absolute z-30 left-1/2 -translate-x-1/2 top-full mt-2 w-60 rounded border border-border bg-surface p-2.5 text-xs font-normal normal-case leading-snug text-foreground"
          style={{ boxShadow: "var(--shadow-popover)" }}
        >
          {texto}
        </span>
      )}
    </span>
  );
}

/** Selo "?" — para rótulos de campo, onde não há um elemento próprio (link,
 * botão) que já sirva de gatilho para o tooltip. */
export function Info({ texto }: { texto: string }) {
  return (
    <Tooltip texto={texto} className="align-middle ml-1">
      <button
        type="button"
        aria-label={`Ajuda: ${texto}`}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-border text-[10px] leading-none text-muted select-none hover:border-accent hover:text-accent"
      >
        ?
      </button>
    </Tooltip>
  );
}
