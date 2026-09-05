"use client";

import { useEffect } from "react";

export function Toast({
  message,
  error,
  onDismiss,
}: {
  message: string;
  error?: boolean;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded bg-surface border px-4 py-3 text-sm ${
        error ? "border-danger" : "border-accent"
      }`}
      style={{ boxShadow: "var(--shadow-popover)" }}
    >
      {error ? (
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="var(--danger)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 8v5" />
          <path d="M12 16.2v.1" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <circle cx="12" cy="12" r="9.5" />
          <path d="M8 12.2l2.6 2.6L16.5 9" />
        </svg>
      )}
      <span className="text-foreground font-medium">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar aviso"
        className="ml-1 text-muted hover:text-foreground text-base leading-none"
      >
        ×
      </button>
    </div>
  );
}
