export const STATUS_LABEL: Record<string, string> = {
  recebida: "Recebida",
  em_triagem: "Em triagem",
  em_apuracao: "Em apuração",
  concluida: "Concluída",
};

/** Mesma paleta usada no painel do admin e na consulta pública — o
 * manifestante e o comitê devem ler o mesmo status com a mesma cor. */
export const STATUS_BADGE_STYLE: Record<string, string> = {
  recebida: "bg-warn-soft text-warn",
  em_triagem: "bg-brass/10 text-brass",
  em_apuracao: "bg-background text-muted border border-border",
  concluida: "bg-accent-soft text-accent",
};

/** Mesma paleta, como cor "crua" (var CSS) — usada em gráficos (SVG) que não
 * podem consumir classes Tailwind diretamente. */
export const STATUS_COLOR_VAR: Record<string, string> = {
  recebida: "var(--warn)",
  em_triagem: "var(--brass)",
  em_apuracao: "var(--muted)",
  concluida: "var(--accent)",
};
