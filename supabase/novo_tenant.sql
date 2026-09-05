-- Runbook para cadastrar um novo inquilino (empresa cliente) numa instância
-- já em produção — diferente de supabase/seed.sql, que é só o primeiro
-- tenant no bootstrap inicial do projeto. Rode cada bloco em ordem no SQL
-- Editor do Supabase (ou psql), ajustando os valores marcados.

-- 1) Cria o tenant. `slug` vira a URL pública: /<slug>/manifestar
insert into tenants (slug, nome)
values ('slug-da-empresa', 'Nome Fantasia da Empresa')
returning id, slug;

-- 2) Semeia os tipos de manifestação padrão (o mesmo catálogo inicial —
--    depois o admin da empresa pode editar em Configurações).
insert into tipos_manifestacao (tenant_id, nome)
select t.id, v.nome
from tenants t
cross join (values
  ('Denúncia'), ('Reclamação'), ('Sugestão'), ('Elogio'),
  ('Solicitação de titular de dados (LGPD)')
) as v(nome)
where t.slug = 'slug-da-empresa';

-- 3) (opcional, mas recomendado) categorias iniciais — adapte a lista
--    conforme o setor da empresa; o admin pode adicionar/inativar depois
--    em /admin/categorias. sla_horas é o prazo de resposta em horas.
insert into categorias (tenant_id, nome, descricao, sla_horas)
select t.id, v.nome, v.descricao, v.sla_horas
from tenants t
cross join (values
  ('Segurança do trabalho', 'Riscos, acidentes ou condições inseguras de trabalho.', 72),
  ('Assédio moral ou sexual (Lei 14.457/2022)', 'Denúncias de assédio e outras formas de violência no ambiente de trabalho.', 48),
  ('Solicitação de titular de dados (LGPD)', 'Acesso, correção, eliminação ou portabilidade de dados pessoais.', 240)
) as v(nome, descricao, sla_horas)
where t.slug = 'slug-da-empresa';

-- 4) Ative o módulo CIPA/assédio (Lei 14.457/2022) se aplicável — feature
--    flag por tenant, também editável depois em Configurações.
insert into feature_flags (tenant_id, flag_key, enabled)
select id, 'cipa_module', true
from tenants
where slug = 'slug-da-empresa';

-- 5) Crie o usuário do primeiro administrador em Authentication > Users
--    no painel do Supabase (e-mail + senha, ou convide por e-mail). Depois
--    vincule esse usuário como admin do tenant:
insert into tenant_users (tenant_id, user_id, role)
select t.id, u.id, 'admin'
from tenants t, auth.users u
where t.slug = 'slug-da-empresa' and u.email = 'admin@empresa.com.br';

-- Pronto: o admin já pode logar em /<slug>/admin/login e convidar o
-- resto do comitê pela própria tela Usuários — não precisa mais de SQL
-- a partir daqui.
