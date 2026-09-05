-- Terceira iteração: anexos/evidências, notas internas do comitê, dados de
-- encarregado (LGPD) e política de retenção configurável por tenant.

-- ---------------------------------------------------------------------------
-- bucket de storage para evidências — privado; todo acesso (leitura e
-- escrita) passa pelo service role a partir de Server Actions que já
-- verificam autorização (papel do tenant ou protocolo+código), então não há
-- política de storage.objects liberada para anon/authenticated.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('evidencias', 'evidencias', false, 10485760)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- dados do encarregado (DPO) e retenção — usados na página de privacidade
-- pública e no painel de configurações.
-- ---------------------------------------------------------------------------
alter table tenants add column dpo_nome text;
alter table tenants add column dpo_email text;
alter table tenants add column retencao_dias integer not null default 1825;

comment on column tenants.retencao_dias is 'Prazo de retenção (dias) para casos concluídos antes de serem elegíveis para anonimização — padrão 5 anos.';

-- ---------------------------------------------------------------------------
-- notas internas — canal de deliberação do comitê, nunca visível ao
-- manifestante (diferente de `mensagens`, que é a thread bidirecional).
-- ---------------------------------------------------------------------------
create table notas_internas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  manifestacao_id uuid not null references manifestacoes(id) on delete cascade,
  autor_tenant_user_id uuid references tenant_users(id),
  corpo text not null,
  created_at timestamptz not null default now()
);

create index notas_internas_manifestacao_idx on notas_internas (manifestacao_id, created_at);

alter table notas_internas enable row level security;

create policy notas_internas_tenant_read on notas_internas for select
  using (public.is_tenant_member(notas_internas.tenant_id));

create policy notas_internas_comite_write on notas_internas for insert
  with check (public.tenant_role(notas_internas.tenant_id) in ('admin', 'comite'));
