# Voz Segura

Protótipo do canal de ouvidoria/denúncias multi-tenant — Next.js (App Router) na
Vercel + Supabase (Postgres com RLS, Auth). Cada empresa cliente é um *tenant*
isolado por `tenant_id`, acessível em `/<slug>/manifestar`.

## Estrutura

- `supabase/migrations/` — schema completo (tenants, categorias, tipos de
  manifestação, feature flags, manifestações, mensagens, identidade isolada,
  auditoria) com todas as políticas de RLS. Arquivos numerados, aplicar em
  ordem.
- `supabase/seed.sql` — cria o primeiro tenant (a indústria demandante) com
  categorias padrão e o feature flag do módulo CIPA.
- `supabase/novo_tenant.sql` — runbook para cadastrar **um novo** tenant numa
  instância já em produção (ainda não existe painel para isso — ver seção
  "Cadastrar um novo inquilino" abaixo).
- `src/app/[tenant]/manifestar` — formulário público, aberto a colaboradores,
  clientes, fornecedores e comunidade, sem login. Gera protocolo + código de
  acesso.
- `src/app/[tenant]/consultar` — consulta e resposta bidirecional pelo
  protocolo, também sem login.
- `src/app/[tenant]/admin` — painel do comitê (Supabase Auth): casos,
  categorias (papel `admin`) e configurações/feature flags (papel `admin`).

## Configurar um projeto Supabase (via dashboard, sem precisar da CLI)

1. Crie um projeto em [supabase.com](https://supabase.com/dashboard) (free
   tier já atende para este protótipo).
2. Em **SQL Editor**, cole e rode o conteúdo de cada arquivo em
   `supabase/migrations/`, em ordem numérica (0001, 0002, ...).
3. Ajuste o `slug`/`nome` no topo de `supabase/seed.sql` (troque todas as
   ocorrências de `industria-demandante`) e rode o arquivo inteiro no SQL
   Editor.
4. Em **Authentication → Users**, crie o primeiro usuário do comitê (e-mail +
   senha).
5. Volte ao SQL Editor e rode o `insert into tenant_users ...` comentado no
   final de `supabase/seed.sql`, com o e-mail que você acabou de criar e
   `role = 'admin'`.
6. Em **Project Settings → API**, copie a `Project URL`, a `anon public key`
   e a `service_role key`.

## Cadastrar um novo inquilino

Não existe (ainda) um painel de administração da plataforma — cada empresa
cliente novo é provisionada rodando `supabase/novo_tenant.sql` no SQL Editor
do Supabase, com o slug/nome/e-mail do admin ajustados no topo de cada
bloco. É um processo manual, de responsabilidade de quem opera a
plataforma (não do cliente) — depois do primeiro admin criado, o resto
(convidar comitê, cadastrar categorias/tipos, configurar retenção/SLA) já é
self-service pelo próprio painel `/admin`.

## Rodar localmente

```bash
cp .env.local.example .env.local   # preencha com as 3 chaves do passo acima
npm install
npm run dev
```

Abra `http://localhost:3000/industria-demandante/manifestar` (ou o slug que
você escolheu).

> Requer Node 18+. Se o `node -v` do seu ambiente mostrar uma versão menor,
> use `nvm use` com uma versão mais nova antes dos comandos acima.

## Deploy na Vercel

```bash
npx vercel login      # login interativo (abre o navegador)
npx vercel link       # associa esta pasta a um projeto Vercel
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel deploy --prod
```

## Limitações conhecidas deste protótipo (ver plano de solução)

- Sem upload de anexos/evidências ainda (tabela `anexos` já existe no schema,
  falta a interface de upload) — próximo incremento.
- Sem cobrança (Stripe) nem provisionamento de novos tenants pela interface —
  hoje um tenant é criado por SQL (`supabase/seed.sql`).
- Free tier do Supabase pausa o projeto após 7 dias de inatividade — não usar
  com dados reais de colaboradores antes de migrar para um plano pago.
