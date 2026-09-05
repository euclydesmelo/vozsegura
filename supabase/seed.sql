-- Dados iniciais do primeiro tenant (a indústria demandante).
-- Ajuste o slug/nome abaixo (troque em todas as ocorrências de
-- 'industria-demandante' neste arquivo) e execute uma única vez no SQL
-- editor do projeto Supabase.

insert into tenants (slug, nome)
values ('industria-demandante', 'Nome Fantasia da Indústria');

insert into categorias (tenant_id, nome, descricao, sla_horas)
select id, v.nome, v.descricao, v.sla_horas
from tenants t
cross join (values
  ('Segurança do trabalho', 'Riscos, acidentes ou condições inseguras de trabalho.', 72),
  ('Meio ambiente', 'Impactos ambientais das operações da indústria.', 168),
  ('Assédio moral ou sexual (Lei 14.457/2022)', 'Denúncias de assédio e outras formas de violência no ambiente de trabalho.', 48),
  ('Fraude ou corrupção', 'Desvios financeiros, conflito de interesse, suborno.', 120),
  ('Relacionamento com fornecedores', 'Práticas irregulares na cadeia de suprimentos.', 168),
  ('Solicitação de titular de dados (LGPD)', 'Acesso, correção, eliminação ou portabilidade de dados pessoais.', 240),
  ('Sugestão', 'Ideias de melhoria para a empresa.', 240),
  ('Elogio', 'Reconhecimento a pessoas, times ou processos.', 240)
) as v(nome, descricao, sla_horas)
where t.slug = 'industria-demandante';

insert into tipos_manifestacao (tenant_id, nome)
select id, v.nome
from tenants t
cross join (values
  ('Denúncia'), ('Reclamação'), ('Sugestão'), ('Elogio'),
  ('Solicitação de titular de dados (LGPD)')
) as v(nome)
where t.slug = 'industria-demandante';

insert into feature_flags (tenant_id, flag_key, enabled)
select id, 'cipa_module', true
from tenants
where slug = 'industria-demandante';

-- Depois de criar seu usuário de administrador em Authentication > Users no
-- painel do Supabase, vincule-o ao tenant substituindo o e-mail abaixo:
--
-- insert into tenant_users (tenant_id, user_id, role)
-- select t.id, u.id, 'admin'
-- from tenants t, auth.users u
-- where t.slug = 'industria-demandante' and u.email = 'seu-email@empresa.com.br';
