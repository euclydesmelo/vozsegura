-- ---------------------------------------------------------------------------
-- tipos_manifestacao — tabela de domínio mantida pelo administrador do
-- tenant (aba Configurações), no mesmo espírito de `categorias`: sem
-- política de DELETE, só inativação lógica. Substitui o enum fixo
-- ('denuncia', 'reclamacao', 'sugestao', 'elogio', 'solicitacao_lgpd') que
-- antes vivia espalhado em `check` constraint + constantes de label
-- duplicadas em vários arquivos do app.
-- ---------------------------------------------------------------------------
create table tipos_manifestacao (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, nome)
);

comment on table tipos_manifestacao is 'Cadastro de tipos de manifestação por tenant. Sem política de DELETE: a única forma de remover um tipo de uso é inativá-lo (ativo = false).';

create trigger tipos_manifestacao_set_updated_at before update on tipos_manifestacao
  for each row execute function set_updated_at();

alter table tipos_manifestacao enable row level security;

create policy tipos_manifestacao_public_read_ativos on tipos_manifestacao for select
  using (ativo = true);

create policy tipos_manifestacao_tenant_read_all on tipos_manifestacao for select
  using (public.is_tenant_member(tipos_manifestacao.tenant_id));

create policy tipos_manifestacao_admin_write on tipos_manifestacao for insert
  with check (public.tenant_role(tipos_manifestacao.tenant_id) = 'admin');

create policy tipos_manifestacao_admin_update on tipos_manifestacao for update
  using (public.tenant_role(tipos_manifestacao.tenant_id) = 'admin')
  with check (public.tenant_role(tipos_manifestacao.tenant_id) = 'admin');

-- semeia, para cada tenant já existente, os cinco tipos que antes eram um
-- enum fixo — preserva o comportamento atual sem exigir recadastro manual.
insert into tipos_manifestacao (tenant_id, nome)
select t.id, v.nome
from tenants t
cross join (values
  ('Denúncia'),
  ('Reclamação'),
  ('Sugestão'),
  ('Elogio'),
  ('Solicitação de titular de dados (LGPD)')
) as v(nome);

-- ---------------------------------------------------------------------------
-- manifestacoes.tipo (text + check) -> manifestacoes.tipo_id (fk)
-- ---------------------------------------------------------------------------
alter table manifestacoes add column tipo_id uuid references tipos_manifestacao(id);

update manifestacoes m
set tipo_id = tm.id
from tipos_manifestacao tm
where tm.tenant_id = m.tenant_id
  and tm.nome = case m.tipo
    when 'denuncia' then 'Denúncia'
    when 'reclamacao' then 'Reclamação'
    when 'sugestao' then 'Sugestão'
    when 'elogio' then 'Elogio'
    when 'solicitacao_lgpd' then 'Solicitação de titular de dados (LGPD)'
  end;

alter table manifestacoes alter column tipo_id set not null;
alter table manifestacoes drop column tipo;

-- trilha de auditoria também passa a registrar mudança de tipo, no mesmo
-- gatilho que já cobre status/categoria/criticidade/atribuição.
create or replace function log_auditoria() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'manifestacoes' then
    if tg_op = 'INSERT' then
      insert into auditoria (tenant_id, manifestacao_id, ator_user_id, acao, detalhe)
      values (new.tenant_id, new.id, auth.uid(), 'manifestacao_criada',
              jsonb_build_object('status', new.status, 'criticidade', new.criticidade));
    elsif tg_op = 'UPDATE' and (old.status is distinct from new.status
                                 or old.categoria_id is distinct from new.categoria_id
                                 or old.tipo_id is distinct from new.tipo_id
                                 or old.criticidade is distinct from new.criticidade
                                 or old.atribuido_a is distinct from new.atribuido_a) then
      insert into auditoria (tenant_id, manifestacao_id, ator_user_id, acao, detalhe)
      values (new.tenant_id, new.id, auth.uid(), 'manifestacao_atualizada',
              jsonb_build_object(
                'status_de', old.status, 'status_para', new.status,
                'categoria_de', old.categoria_id, 'categoria_para', new.categoria_id,
                'tipo_de', old.tipo_id, 'tipo_para', new.tipo_id,
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

-- ---------------------------------------------------------------------------
-- automação do fluxo de atendimento: os dois avanços de status mais
-- previsíveis deixam de depender de o comitê lembrar de mexer no seletor
-- manualmente. "concluída" continua 100% manual (exige parecer) — é a
-- etapa com peso legal/de auditoria, não deve avançar sozinha.
-- ---------------------------------------------------------------------------

-- recebida -> em_triagem no primeiro acesso de um admin/comitê ao caso
-- (registrar_visualizacao já roda a cada abertura da página do caso).
create or replace function public.registrar_visualizacao(target_manifestacao uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id from manifestacoes where id = target_manifestacao;

  if v_tenant_id is null or not public.is_tenant_member(v_tenant_id) then
    raise exception 'sem acesso a este caso';
  end if;

  insert into auditoria (tenant_id, manifestacao_id, ator_user_id, acao, detalhe)
  values (v_tenant_id, target_manifestacao, auth.uid(), 'caso_visualizado', '{}'::jsonb);

  if public.tenant_role(v_tenant_id) in ('admin', 'comite') then
    update manifestacoes
    set status = 'em_triagem'
    where id = target_manifestacao and status = 'recebida';
  end if;
end;
$$;
