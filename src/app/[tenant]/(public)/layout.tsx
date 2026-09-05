import Image from "next/image";
import Link from "next/link";
import { getTenantBySlug } from "@/lib/tenant";

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-border bg-surface">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href={`/${slug}/manifestar`} className="font-serif font-semibold flex items-center gap-2">
            <Image src="/icon.svg" alt="" width={18} height={18} />
            Voz Segura — {tenant.nome}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href={`/${slug}/manual`} className="text-muted hover:text-accent">
              Manual
            </Link>
            <Link href={`/${slug}/consultar`} className="text-muted hover:text-accent">
              Consultar protocolo
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
