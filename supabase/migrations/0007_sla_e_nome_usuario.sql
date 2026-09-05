-- (b) prazo de resposta padrão configurável por tenant, usado quando a
-- manifestação não tem categoria selecionada.
alter table tenants add column sla_padrao_dias integer not null default 7;

comment on column tenants.sla_padrao_dias is 'Prazo de resposta (dias) para manifestações sem categoria selecionada.';

-- (c) nome de exibição do membro do comitê, além do e-mail (que vem do
-- Auth). Fica em tenant_users porque é o registro do vínculo com o tenant.
alter table tenant_users add column nome text;
