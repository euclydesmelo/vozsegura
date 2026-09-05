import Link from "next/link";
import { ConsultaClient } from "./consulta-client";

export default async function ConsultarPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl font-semibold mb-2">Consultar manifestação</h1>
      <p className="text-muted mb-8">
        Use o protocolo e o código de acesso recebidos no momento do envio. Ainda não enviou
        nenhuma?{" "}
        <Link href={`/${slug}/manifestar`} className="text-accent hover:underline">
          Registrar uma nova manifestação
        </Link>
        .
      </p>
      <ConsultaClient tenantSlug={slug} />
    </div>
  );
}
