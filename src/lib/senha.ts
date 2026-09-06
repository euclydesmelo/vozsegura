import "server-only";
import { randomBytes } from "node:crypto";

// Maiúsculas, minúsculas e dígitos, sem caracteres ambíguos (0/O, 1/I/l) —
// precisa ser fácil de repassar por telefone ou digitar de uma tela.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/** Senha temporária de uso único — o admin repassa para a pessoa convidada,
 * que é obrigada a trocá-la no primeiro login (ver deve_trocar_senha). */
export function gerarSenhaTemporaria(tamanho = 12): string {
  const bytes = randomBytes(tamanho);
  let out = "";
  for (let i = 0; i < tamanho; i++) {
    out += ALFABETO[bytes[i] % ALFABETO.length];
  }
  return out;
}
