-- Canal de Ouvidoria Multi-Tenant — schema inicial
-- Convenções:
--   * toda tabela de domínio do tenant carrega tenant_id e é isolada por RLS
--   * exclusão de cadastros é sempre lógica (coluna "ativo"); não existem
--     políticas de DELETE em tabelas de domínio nem na trilha de auditoria
--   * dados de identidade do manifestante ficam em tabela apartada, com
--     RLS mais restritiva do que o restante do caso

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------------------
create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  nome text not null,
  created_at timestamptz not null default now()
);

comment on table tenants is 'Cada linha é uma empresa cliente (tenant) da plataforma.';

-- ---------------------------------------------------------------------------
-- tenant_users — vínculo entre auth.users (comitê/administradores) e tenant
-- ---------------------------------------------------------------------------
create table tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'comite', 'leitor')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

comment on table tenant_users is 'Papel de cada usuário autenticado (comitê de ética/compliance) dentro de um tenant. Denunciantes/manifestantes não têm login e não aparecem aqui.';

-- ---------------------------------------------------------------------------
-- categorias — tabela de domínio mantida pelo administrador do tenant
-- ---------------------------------------------------------------------------
create table categorias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  descricao text,
  sla_horas integer not null default 240 check (sla_horas > 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, nome)
);

comment on table categorias is 'Cadastro de categorias de manifestação por tenant. Sem política de DELETE: a única forma de remover uma categoria de uso é inativá-la (ativo = false).';

-- ---------------------------------------------------------------------------
-- feature_flags — capacidades opcionais ligadas/desligadas por tenant
-- ---------------------------------------------------------------------------
create table feature_flags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  flag_key text not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (tenant_id, flag_key)
);

comment on table feature_flags is 'flag_key conhecida nesta versão: cipa_module (Lei 14.457/2022 — módulo de assédio/CIPA com aviso reforçado de sigilo no formulário público).';

-- ---------------------------------------------------------------------------
-- manifestacoes — o caso em si (denúncia, reclamação, sugestão, elogio, LGPD)
-- ---------------------------------------------------------------------------
create table manifestacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  protocolo text not null unique,
  codigo_hash text not null,
  categoria_id uuid references categorias(id),
  tipo text not null check (tipo in ('denuncia', 'reclamacao', 'sugestao', 'elogio', 'solicitacao_lgpd')),
  perfil_manifestante text not null check (perfil_manifestante in ('colaborador', 'cliente', 'fornecedor', 'comunidade', 'outro')),
  identificado boolean not null default false,
  descricao text not null,
  status text not null default 'recebida' check (status in ('recebida', 'em_triagem', 'em_apuracao', 'concluida')),
  criticidade text not null default 'media' check (criticidade in ('baixa', 'media', 'alta')),
  prazo_resposta timestamptz,
  atribuido_a uuid references tenant_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  encerrado_at timestamptz
);

comment on table manifestacoes is 'protocolo + codigo_hash são o único vínculo com o manifestante anônimo; nenhuma coluna de IP/dispositivo é gravada aqui de propósito.';

create index manifestacoes_tenant_status_idx on manifestacoes (tenant_id, status);

-- ---------------------------------------------------------------------------
-- manifestante_identidade — separada da tabela de caso, acesso restrito
-- ---------------------------------------------------------------------------
create table manifestante_identidade (
  manifestacao_id uuid primary key references manifestacoes(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text,
  email text,
  telefone text,
  created_at timestamptz not null default now()
);

comment on table manifestante_identidade is 'Só existe linha aqui quando identificado = true na manifestação. Legível apenas por role admin do tenant — nem todo membro do comitê precisa saber quem denunciou.';

-- ---------------------------------------------------------------------------
-- mensagens — thread bidirecional vinculada ao protocolo
-- ---------------------------------------------------------------------------
create table mensagens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  manifestacao_id uuid not null references manifestacoes(id) on delete cascade,
  autor_tipo text not null check (autor_tipo in ('manifestante', 'comite')),
  autor_tenant_user_id uuid references tenant_users(id),
  corpo text not null,
  created_at timestamptz not null default now()
);

create index mensagens_manifestacao_idx on mensagens (manifestacao_id, created_at);

-- ---------------------------------------------------------------------------
-- anexos — evidências ligadas ao caso ou a uma mensagem
-- ---------------------------------------------------------------------------
create table anexos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  manifestacao_id uuid not null references manifestacoes(id) on delete cascade,
  mensagem_id uuid references mensagens(id) on delete cascade,
  storage_path text not null,
  nome_arquivo text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- auditoria — trilha imutável (sem UPDATE/DELETE possível via RLS)
-- ---------------------------------------------------------------------------
create table auditoria (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  manifestacao_id uuid references manifestacoes(id) on delete set null,
  ator_user_id uuid references auth.users(id),
  acao text not null,
  detalhe jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index auditoria_tenant_idx on auditoria (tenant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- gatilhos utilitários
-- ---------------------------------------------------------------------------
create function set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger categorias_set_updated_at before update on categorias
  for each row execute function set_updated_at();

create trigger manifestacoes_set_updated_at before update on manifestacoes
  for each row execute function set_updated_at();

-- registra automaticamente toda criação/mudança de status de um caso e toda
-- mensagem trocada, para a trilha de auditoria não depender do código da
-- aplicação lembrar de gravar o log.
create function log_auditoria() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'manifestacoes' then
    if tg_op = 'INSERT' then
      insert into auditoria (tenant_id, manifestacao_id, ator_user_id, acao, detalhe)
      values (new.tenant_id, new.id, auth.uid(), 'manifestacao_criada',
              jsonb_build_object('status', new.status, 'criticidade', new.criticidade));
    elsif tg_op = 'UPDATE' and (old.status is distinct from new.status
                                 or old.categoria_id is distinct from new.categoria_id
                                 or old.criticidade is distinct from new.criticidade
                                 or old.atribuido_a is distinct from new.atribuido_a) then
      insert into auditoria (tenant_id, manifestacao_id, ator_user_id, acao, detalhe)
      values (new.tenant_id, new.id, auth.uid(), 'manifestacao_atualizada',
              jsonb_build_object(
                'status_de', old.status, 'status_para', new.status,
                'categoria_de', old.categoria_id, 'categoria_para', new.categoria_id,
                'criticidade_de', old.criticidade, 'criticidade_para', new.criticidade,
                'atribuido_de', old.atribuido_a, 'atribuido_para', new.atribuido_a
              ));
    end if;
  elsif tg_table_name = 'mensagens' and tg_op = 'INSERT' then
    insert into auditoria (tenant_id, manifestacao_id, ator_user_id, acao, detalhe)
    values (new.tenant_id, new.manifestacao_id, auth.uid(), 'mensagem_registrada',
            jsonb_build_object('autor_tipo', new.autor_tipo));
  end if;
  return new;
end;
$$;

create trigger manifestacoes_auditoria
  after insert or update on manifestacoes
  for each row execute function log_auditoria();

create trigger mensagens_auditoria
  after insert on mensagens
  for each row execute function log_auditoria();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table tenants enable row level security;
alter table tenant_users enable row level security;
alter table categorias enable row level security;
alter table feature_flags enable row level security;
alter table manifestacoes enable row level security;
alter table manifestante_identidade enable row level security;
alter table mensagens enable row level security;
alter table anexos enable row level security;
alter table auditoria enable row level security;

-- Funções auxiliares "security definer": consultam tenant_users por fora do
-- RLS (o dono da função, postgres, tem bypassrls). Sem isso, qualquer política
-- de tenant_users que precise consultar a própria tenant_users reaplicaria o
-- RLS de tenant_users recursivamente (erro 42P17 "infinite recursion").
create function public.tenant_role(target_tenant uuid) returns text
  language sql security definer stable set search_path = public as $$
  select role from tenant_users
  where tenant_id = target_tenant and user_id = auth.uid()
  limit 1;
$$;

create function public.is_tenant_member(target_tenant uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from tenant_users
    where tenant_id = target_tenant and user_id = auth.uid()
  );
$$;

-- tenants: dado público (slug/nome) para resolver a página do canal
create policy tenants_public_read on tenants for select using (true);

-- tenant_users: cada usuário vê seus próprios vínculos; admin vê o time todo
create policy tenant_users_self_read on tenant_users for select
  using (user_id = auth.uid());

create policy tenant_users_admin_read on tenant_users for select
  using (public.tenant_role(tenant_users.tenant_id) = 'admin');

create policy tenant_users_admin_write on tenant_users for all
  using (public.tenant_role(tenant_users.tenant_id) = 'admin')
  with check (public.tenant_role(tenant_users.tenant_id) = 'admin');

-- categorias: leitura pública das ativas (formulário aberto a qualquer
-- manifestante); time do tenant enxerga tudo; só admin escreve; sem DELETE.
create policy categorias_public_read_ativas on categorias for select
  using (ativo = true);

create policy categorias_tenant_read_all on categorias for select
  using (public.is_tenant_member(categorias.tenant_id));

create policy categorias_admin_write on categorias for insert
  with check (public.tenant_role(categorias.tenant_id) = 'admin');

create policy categorias_admin_update on categorias for update
  using (public.tenant_role(categorias.tenant_id) = 'admin')
  with check (public.tenant_role(categorias.tenant_id) = 'admin');

-- feature_flags: leitura pública (o formulário público precisa saber se o
-- módulo CIPA está ligado para exibir o aviso legal); só admin escreve.
create policy feature_flags_public_read on feature_flags for select using (true);

create policy feature_flags_admin_write on feature_flags for insert
  with check (public.tenant_role(feature_flags.tenant_id) = 'admin');

create policy feature_flags_admin_update on feature_flags for update
  using (public.tenant_role(feature_flags.tenant_id) = 'admin')
  with check (public.tenant_role(feature_flags.tenant_id) = 'admin');

-- manifestacoes: sem política de INSERT — só a rota de API com a service
-- role (que ignora RLS) pode criar um caso; isso impede qualquer client-side
-- de gravar campos fora do fluxo controlado do protocolo.
create policy manifestacoes_tenant_read on manifestacoes for select
  using (public.is_tenant_member(manifestacoes.tenant_id));

create policy manifestacoes_tenant_update on manifestacoes for update
  using (public.tenant_role(manifestacoes.tenant_id) in ('admin', 'comite'))
  with check (public.tenant_role(manifestacoes.tenant_id) in ('admin', 'comite'));

-- manifestante_identidade: só admin lê; escrita só via service role.
create policy manifestante_identidade_admin_read on manifestante_identidade for select
  using (public.tenant_role(manifestante_identidade.tenant_id) = 'admin');

-- mensagens: leitura pelo time do tenant; escrita autenticada só por
-- admin/comite (mensagens do manifestante entram pela rota com service role).
create policy mensagens_tenant_read on mensagens for select
  using (public.is_tenant_member(mensagens.tenant_id));

create policy mensagens_comite_write on mensagens for insert
  with check (public.tenant_role(mensagens.tenant_id) in ('admin', 'comite'));

-- anexos: leitura pelo time do tenant; upload autenticado por admin/comite
-- (anexos enviados pelo manifestante entram pela rota com service role).
create policy anexos_tenant_read on anexos for select
  using (public.is_tenant_member(anexos.tenant_id));

create policy anexos_comite_write on anexos for insert
  with check (public.tenant_role(anexos.tenant_id) in ('admin', 'comite'));

-- auditoria: só admin lê; nunca há UPDATE/DELETE (nenhuma política = negado).
create policy auditoria_admin_read on auditoria for select
  using (public.tenant_role(auditoria.tenant_id) = 'admin');
