import Link from "next/link";
import { getAdminContext } from "@/lib/admin";
import { Tooltip } from "@/components/Info";
import { ProfileMenu } from "./profile-menu";

const LINK_INFO: Record<string, string> = {
  Casos: "Lista de manifestações recebidas — filtre por status, atraso ou busque por protocolo/relato.",
  Indicadores: "Taxa de resolução, tempo médio de resposta e recorrência por categoria.",
  Categorias: "Cadastro de categorias de manifestação — inativar em vez de excluir.",
  Usuários: "Quem tem acesso a este canal e com qual papel.",
  Configurações: "Módulo CIPA, encarregado (DPO), retenção de dados e prazo de resposta padrão.",
};

export default async function AdminAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const { tenant, role, nome, user } = await getAdminContext(slug);

  const links = [
    { href: `/${slug}/admin`, label: "Casos" },
    ...(role === "admin"
      ? [
          { href: `/${slug}/admin/indicadores`, label: "Indicadores" },
          { href: `/${slug}/admin/categorias`, label: "Categorias" },
          { href: `/${slug}/admin/usuarios`, label: "Usuários" },
          { href: `/${slug}/admin/configuracoes`, label: "Configurações" },
        ]
      : []),
  ];

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-border bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <p className="font-serif font-semibold">{tenant.nome}</p>
          <nav className="flex items-center gap-5 text-sm">
            {links.map((l) => (
              <Tooltip key={l.href} texto={LINK_INFO[l.label]}>
                <Link href={l.href} className="text-muted hover:text-accent">
                  {l.label}
                </Link>
              </Tooltip>
            ))}
            <Tooltip texto="Abre em outra aba — sua sessão no painel continua ativa aqui.">
              <a
                href={`/${slug}/manifestar`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-accent"
              >
                Formulário público ↗
              </a>
            </Tooltip>
            <ProfileMenu tenantSlug={slug} nome={nome} email={user.email ?? ""} role={role} />
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">{children}</main>
    </div>
  );
}
