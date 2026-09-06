export type TenantRole = "admin" | "comite" | "leitor";

export type ManifestacaoStatus =
  | "recebida"
  | "em_triagem"
  | "em_apuracao"
  | "concluida";

export type Criticidade = "baixa" | "media" | "alta";

export type PerfilManifestante =
  | "colaborador"
  | "cliente"
  | "fornecedor"
  | "comunidade"
  | "outro";

export interface Tenant {
  id: string;
  slug: string;
  nome: string;
  dpo_nome: string | null;
  dpo_email: string | null;
  retencao_dias: number;
  sla_padrao_dias: number;
  created_at: string;
}

export interface Categoria {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  sla_horas: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TipoManifestacao {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlag {
  id: string;
  tenant_id: string;
  flag_key: string;
  enabled: boolean;
  updated_at: string;
}

export interface Manifestacao {
  id: string;
  tenant_id: string;
  protocolo: string;
  categoria_id: string | null;
  tipo_id: string;
  perfil_manifestante: PerfilManifestante;
  identificado: boolean;
  descricao: string;
  status: ManifestacaoStatus;
  criticidade: Criticidade;
  prazo_resposta: string | null;
  atribuido_a: string | null;
  resolucao: string | null;
  created_at: string;
  updated_at: string;
  encerrado_at: string | null;
  categorias?: Pick<Categoria, "id" | "nome"> | null;
  tipos_manifestacao?: Pick<TipoManifestacao, "id" | "nome"> | null;
}

export interface Mensagem {
  id: string;
  tenant_id: string;
  manifestacao_id: string;
  autor_tipo: "manifestante" | "comite";
  autor_tenant_user_id: string | null;
  corpo: string;
  created_at: string;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  nome: string | null;
  deve_trocar_senha: boolean;
  created_at: string;
}

export interface NotaInterna {
  id: string;
  tenant_id: string;
  manifestacao_id: string;
  autor_tenant_user_id: string | null;
  corpo: string;
  created_at: string;
}

export interface Anexo {
  id: string;
  tenant_id: string;
  manifestacao_id: string;
  mensagem_id: string | null;
  storage_path: string;
  nome_arquivo: string;
  created_at: string;
}

export const CIPA_FLAG_KEY = "cipa_module";
export const EVIDENCIAS_BUCKET = "evidencias";
export const TIPOS_ARQUIVO_ACEITOS =
  "image/png,image/jpeg,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const TAMANHO_MAX_ARQUIVO = 10 * 1024 * 1024; // 10MB, igual ao limite do bucket
export const MAX_ANEXOS_POR_ENVIO = 3;
