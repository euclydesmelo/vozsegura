-- Alternativa ao convite por e-mail: o admin pode criar o usuário já com uma
-- senha temporária definida na hora (sem depender de entrega de e-mail),
-- exigindo troca no primeiro login. Os dois modos são exclusivos por
-- usuário — um ou outro, nunca os dois.
alter table tenant_users add column deve_trocar_senha boolean not null default false;

comment on column tenant_users.deve_trocar_senha is 'true quando o usuário foi criado com senha temporária definida pelo admin (sem convite por e-mail) — força troca de senha no próximo login antes de liberar o restante do painel.';

-- security definer porque a política de escrita de tenant_users só libera
-- admin; aqui qualquer papel precisa poder encerrar sua própria pendência de
-- troca de senha. Restrito ao próprio auth.uid(), nunca afeta outra linha.
create function public.concluir_troca_senha_obrigatoria(target_tenant uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  update tenant_users
  set deve_trocar_senha = false
  where tenant_id = target_tenant and user_id = auth.uid();
end;
$$;

grant execute on function public.concluir_troca_senha_obrigatoria(uuid) to authenticated;
