-- Faltava política de UPDATE em `tenants` — necessária para o admin editar
-- dados do encarregado (DPO) e retenção em /admin/configuracoes.
create policy tenants_admin_update on tenants for update
  using (public.tenant_role(tenants.id) = 'admin')
  with check (public.tenant_role(tenants.id) = 'admin');
