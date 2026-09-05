-- Suporte a gestão de usuários do tenant: convidar um segundo admin (ou
-- membro do comitê) é o que resolve, na prática, o conflito de interesse de
-- ter só uma pessoa administrando o canal — a demandante pode adicionar um
-- ouvidor independente sem precisar de outra migração.

-- auth.users não é exposta via REST (schema não listado em api.schemas),
-- então associar um convite a um usuário que já existe exige uma função
-- security definer, como já fazemos para tudo que toca tenant_users/auth.
create function public.buscar_user_id_por_email(p_email text) returns uuid
  language sql security definer stable set search_path = public as $$
  select id from auth.users where email = p_email limit 1;
$$;

grant execute on function public.buscar_user_id_por_email(text) to authenticated;
