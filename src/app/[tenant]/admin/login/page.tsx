import { Suspense } from "react";
import Image from "next/image";
import { getTenantBySlug } from "@/lib/tenant";
import { LoginForm } from "./login-form";

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-border bg-surface">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-2">
          <Image src="/icon.svg" alt="" width={20} height={20} />
          <span className="font-serif font-semibold">Voz Segura</span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="card p-8" style={{ boxShadow: "var(--shadow-popover)" }}>
            <p className="text-xs uppercase tracking-wide text-muted font-mono mb-1.5">
              {tenant.nome}
            </p>
            <h1 className="font-serif text-xl font-semibold mb-2">Acesso do comitê</h1>
            <p className="text-muted text-sm mb-6 leading-relaxed">
              Área restrita ao comitê de ética/compliance. Denunciantes não precisam de login —
              use{" "}
              <a href={`/${slug}/consultar`} className="text-accent hover:underline">
                consultar protocolo
              </a>{" "}
              com o código recebido no envio.
            </p>
            <Suspense>
              <LoginForm tenantSlug={slug} />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
