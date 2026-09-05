export function estaAtrasado(status: string, prazoResposta: string | null): boolean {
  if (status === "concluida" || !prazoResposta) return false;
  return new Date(prazoResposta).getTime() < Date.now();
}

/** "168h" sozinho não é escaneável — a maioria das pessoas pensa em dias. */
export function formatarSlaHoras(horas: number): string {
  if (horas % 24 === 0) return `${horas}h · ${horas / 24}d`;
  return `${horas}h`;
}
