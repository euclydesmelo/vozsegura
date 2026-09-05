import Link from "next/link";
import { getTenantBySlug } from "@/lib/tenant";

export default async function PrivacidadePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);
  const anosRetencao = Math.round(tenant.retencao_dias / 365);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold mb-2">Política de Privacidade</h1>
        <p className="text-muted text-sm">
          Canal de ouvidoria de {tenant.nome} — como tratamos os dados de quem usa este canal,
          conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">O que coletamos</h2>
        <p className="text-sm text-muted">
          O relato da manifestação, categoria e seu perfil (colaborador, cliente, fornecedor ou
          comunidade). Se você optar por se identificar, também nome, e-mail e/ou telefone. Se
          você não se identificar, nenhum dado de IP, dispositivo ou localização é registrado.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Por que tratamos esses dados</h2>
        <p className="text-sm text-muted">
          Para apurar a manifestação e cumprir a obrigação legal de manter um canal de denúncias
          efetivo (Decreto 11.129/2022, que regulamenta a Lei 12.846/2013, e Lei 14.457/2022, no
          caso de assédio). A base legal é o cumprimento de obrigação legal/regulatória e o
          legítimo interesse em manter um ambiente íntegro — não pedimos consentimento como base,
          porque ele poderia ser revogado a qualquer momento, o que fragilizaria a apuração.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Quem tem acesso</h2>
        <p className="text-sm text-muted">
          O comitê de ética/compliance de {tenant.nome} acessa o relato para apurá-lo. Se você se
          identificar, seu nome e contato ficam visíveis apenas para o administrador do canal —
          não para todo o comitê.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Por quanto tempo guardamos</h2>
        <p className="text-sm text-muted">
          Casos concluídos são mantidos por até {anosRetencao} anos, prazo necessário para fins de
          auditoria e defesa em eventual processo, depois do qual os dados pessoais associados são
          elegíveis para eliminação.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Seus direitos</h2>
        <p className="text-sm text-muted">
          Você pode solicitar acesso, correção, eliminação ou portabilidade dos seus dados a
          qualquer momento — use o próprio canal escolhendo{" "}
          <Link href={`/${slug}/manifestar`} className="text-accent hover:underline">
            &quot;Solicitação de titular de dados (LGPD)&quot;
          </Link>{" "}
          como tipo de manifestação, ou fale diretamente com o encarregado abaixo.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Encarregado (DPO)</h2>
        <p className="text-sm text-muted">
          {tenant.dpo_nome || tenant.dpo_email ? (
            <>
              {tenant.dpo_nome && <>{tenant.dpo_nome} — </>}
              {tenant.dpo_email && <a href={`mailto:${tenant.dpo_email}`} className="text-accent hover:underline">{tenant.dpo_email}</a>}
            </>
          ) : (
            <>
              {tenant.nome} ainda não cadastrou um contato direto para o encarregado — use o canal
              de manifestação acima para exercer seus direitos.
            </>
          )}
        </p>
      </section>
    </div>
  );
}
