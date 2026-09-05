import "server-only";
import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import {
  EVIDENCIAS_BUCKET,
  MAX_ANEXOS_POR_ENVIO,
  TAMANHO_MAX_ARQUIVO,
  TIPOS_ARQUIVO_ACEITOS,
} from "@/lib/supabase/types";

const TIPOS_ACEITOS = new Set(TIPOS_ARQUIVO_ACEITOS.split(","));

export function extrairArquivosValidos(formData: FormData, campo: string): File[] {
  const arquivos = formData
    .getAll(campo)
    .filter((v): v is File => v instanceof File && v.size > 0);

  return arquivos.filter((f) => TIPOS_ACEITOS.has(f.type) && f.size <= TAMANHO_MAX_ARQUIVO).slice(0, MAX_ANEXOS_POR_ENVIO);
}

/** Faz upload dos arquivos e grava as linhas em `anexos`. Ignora falhas
 * individuais de upload para não travar o registro da manifestação por
 * causa de um anexo problemático — evidência é um complemento, não deveria
 * bloquear o canal de denúncia em si. */
export async function salvarAnexos(
  tenantId: string,
  manifestacaoId: string,
  arquivos: File[],
  mensagemId?: string
): Promise<void> {
  if (arquivos.length === 0) return;

  const supabase = createServiceClient();

  for (const arquivo of arquivos) {
    const path = `${tenantId}/${manifestacaoId}/${randomUUID()}-${arquivo.name}`;
    const { error: uploadError } = await supabase.storage
      .from(EVIDENCIAS_BUCKET)
      .upload(path, arquivo, { contentType: arquivo.type });

    if (uploadError) {
      console.error("Falha ao subir anexo:", uploadError);
      continue;
    }

    await supabase.from("anexos").insert({
      tenant_id: tenantId,
      manifestacao_id: manifestacaoId,
      mensagem_id: mensagemId ?? null,
      storage_path: path,
      nome_arquivo: arquivo.name,
    });
  }
}

export async function listarAnexosComUrl(manifestacaoId: string) {
  const supabase = createServiceClient();
  const { data: anexos } = await supabase
    .from("anexos")
    .select("id, nome_arquivo, storage_path, created_at")
    .eq("manifestacao_id", manifestacaoId)
    .order("created_at");

  if (!anexos || anexos.length === 0) return [];

  return Promise.all(
    anexos.map(async (a) => {
      const { data } = await supabase.storage
        .from(EVIDENCIAS_BUCKET)
        .createSignedUrl(a.storage_path, 60 * 10); // 10 minutos
      return { id: a.id, nome: a.nome_arquivo, url: data?.signedUrl ?? null };
    })
  );
}
