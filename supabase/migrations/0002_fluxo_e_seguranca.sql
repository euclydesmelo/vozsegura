-- Segunda iteração: status passa a governar o fluxo (parecer obrigatório ao
-- encerrar, log de visualização) e rate limiting básico nas rotas públicas.

-- ---------------------------------------------------------------------------
-- parecer de encerramento — exigido pela UI ao mudar status para 'concluida'
-- ---------------------------------------------------------------------------
alter table manifestacoes add column resolucao text;

comment on column manifestacoes.resolucao is 'Parecer de encerramento — a UI exige preenchido antes de permitir status = concluida. Alimenta indicadores futuros (taxa de resolução, recorrência).';

-- ---------------------------------------------------------------------------
-- log de visualização — gatilho de banco não dispara em SELECT, então isso
-- precisa ser chamado explicitamente pela aplicação ao abrir um caso.
-- security definer para poder gravar em auditoria (tabela sem política de
-- INSERT liberada para authenticated) sem abrir uma brecha de escrita direta.
-- ---------------------------------------------------------------------------
create function public.registrar_visualizacao(target_manifestacao uuid) returns void
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
end;
$$;

grant execute on function public.registrar_visualizacao(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- rate limiting — janela fixa por chave (ex.: "manifestar:<tenant>:<ip>").
-- A tabela não tem nenhuma política de RLS liberada (fica inacessível por
-- REST); só a função security definer abaixo pode lê-la/escrevê-la.
-- ---------------------------------------------------------------------------
create table rate_limits (
  chave text primary key,
  contagem integer not null default 1,
  expira_em timestamptz not null
);

alter table rate_limits enable row level security;

create function public.checar_rate_limit(p_chave text, p_max integer, p_janela_segundos integer)
  returns boolean
  language plpgsql security definer set search_path = public as $$
declare
  v_permitido boolean;
begin
  insert into rate_limits (chave, contagem, expira_em)
  values (p_chave, 1, now() + make_interval(secs => p_janela_segundos))
  on conflict (chave) do update
    set contagem = case
          when rate_limits.expira_em < now() then 1
          else rate_limits.contagem + 1
        end,
        expira_em = case
          when rate_limits.expira_em < now() then now() + make_interval(secs => p_janela_segundos)
          else rate_limits.expira_em
        end
  returning (contagem <= p_max) into v_permitido;

  return v_permitido;
end;
$$;

grant execute on function public.checar_rate_limit(text, integer, integer) to anon, authenticated, service_role;
