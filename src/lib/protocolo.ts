import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// alfabeto sem caracteres ambíguos (sem 0/O, 1/I/L) — protocolo e código
// precisam ser digitados de volta por alguém sem cadastro nem e-mail.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function gerarTrecho(tamanho: number): string {
  const bytes = randomBytes(tamanho);
  let out = "";
  for (let i = 0; i < tamanho; i++) {
    out += ALFABETO[bytes[i] % ALFABETO.length];
  }
  return out;
}

/** Ex.: OUV-7K4QQ2XM — identifica o caso, não é segredo. */
export function gerarProtocolo(): string {
  return `OUV-${gerarTrecho(8)}`;
}

/** Ex.: 4H7K-QX9M-2VBP — é o segredo; só existe em texto puro na tela de
 * confirmação, uma única vez. */
export function gerarCodigoAcesso(): string {
  const bruto = gerarTrecho(12);
  return `${bruto.slice(0, 4)}-${bruto.slice(4, 8)}-${bruto.slice(8, 12)}`;
}

const SCRYPT_KEYLEN = 64;

export function hashCodigoAcesso(codigo: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(codigo, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verificarCodigoAcesso(codigo: string, codigoHash: string): boolean {
  const [salt, hashArmazenado] = codigoHash.split(":");
  if (!salt || !hashArmazenado) return false;
  const hashCalculado = scryptSync(codigo, salt, SCRYPT_KEYLEN);
  const bufferArmazenado = Buffer.from(hashArmazenado, "hex");
  if (bufferArmazenado.length !== hashCalculado.length) return false;
  return timingSafeEqual(hashCalculado, bufferArmazenado);
}
