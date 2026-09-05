-- Retenção configurável (tenants.retencao_dias, adicionado na migration
-- 0003): a eliminação não é automática por padrão — o admin revisa a
-- contagem de casos elegíveis em /admin/configuracoes e aciona manualmente,
-- para não correr o risco de um job apagar dados sem supervisão humana
-- ainda nesta fase do produto.

create function public.contar_dados_expirados(target_tenant uuid) returns integer
  language sql security definer stable set search_path = public as $$
  select count(*)::integer
  from manifestante_identidade mi
  join manifestacoes m on m.id = mi.manifestacao_id
  join tenants t on t.id = m.tenant_id
  where m.tenant_id = target_tenant
    and m.status = 'concluida'
    and m.encerrado_at < now() - make_interval(days => t.retencao_dias)
    and public.tenant_role(target_tenant) = 'admin';
$$;

create function public.anonimizar_dados_expirados(target_tenant uuid) returns integer
  language plpgsql security definer set search_path = public as $$
declare
  v_removidos integer;
begin
  if public.tenant_role(target_tenant) <> 'admin' then
    raise exception 'apenas administradores podem anonimizar dados';
  end if;

  with elegiveis as (
    select mi.manifestacao_id
    from manifestante_identidade mi
    join manifestacoes m on m.id = mi.manifestacao_id
    join tenants t on t.id = m.tenant_id
    where m.tenant_id = target_tenant
      and m.status = 'concluida'
      and m.encerrado_at < now() - make_interval(days => t.retencao_dias)
  ),
  apagados as (
    delete from manifestante_identidade
    where manifestacao_id in (select manifestacao_id from elegiveis)
    returning manifestacao_id
  )
  select count(*) into v_removidos from apagados;

  if v_removidos > 0 then
    insert into auditoria (tenant_id, ator_user_id, acao, detalhe)
    values (target_tenant, auth.uid(), 'dados_anonimizados', jsonb_build_object('quantidade', v_removidos));
  end if;

  return v_removidos;
end;
$$;

grant execute on function public.contar_dados_expirados(uuid) to authenticated;
grant execute on function public.anonimizar_dados_expirados(uuid) to authenticated;
