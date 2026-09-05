import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { enviarEmail, getBaseUrl } from "@/lib/email";

async function getComiteEmails(tenantId: string): Promise<string[]> {
  const supabase = createServiceClient();

  const { data: membros } = await supabase
    .from("tenant_users")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .in("role", ["admin", "comite"]);

  if (!membros || membros.length === 0) return [];

  const emails = await Promise.all(
    membros.map(async (m) => {
      const { data } = await supabase.auth.admin.getUserById(m.user_id);
      return data.user?.email ?? null;
    })
  );

  return emails.filter((e): e is string => !!e);
}

function layoutEmail(corpo: string): string {
  return `<div style="font-family:sans-serif;font-size:15px;color:#16211F;line-height:1.5">${corpo}</div>`;
}

export async function notificarComiteNovaManifestacao(
  tenantSlug: string,
  tenantId: string,
  protocolo: string,
  tipoLabel: string,
  criticidade: string
) {
  const emails = await getComiteEmails(tenantId);
  if (emails.length === 0) return;

  const url = `${getBaseUrl()}/${tenantSlug}/admin`;
  const html = layoutEmail(`
    <p>Uma nova manifestação foi registrada no canal de ouvidoria.</p>
    <p><strong>Protocolo:</strong> ${protocolo}<br>
    <strong>Tipo:</strong> ${tipoLabel}<br>
    <strong>Criticidade:</strong> ${criticidade}</p>
    <p><a href="${url}">Acessar o painel</a> para tratar o caso.</p>
    <p style="color:#7C877F;font-size:13px">O conteúdo do relato não é enviado por e-mail por precaução — acesse o painel para lê-lo.</p>
  `);

  await Promise.all(
    emails.map((to) =>
      enviarEmail({ to, subject: `Nova manifestação — ${protocolo}`, html })
    )
  );
}

export async function notificarComiteNovaMensagem(
  tenantSlug: string,
  tenantId: string,
  protocolo: string
) {
  const emails = await getComiteEmails(tenantId);
  if (emails.length === 0) return;

  const url = `${getBaseUrl()}/${tenantSlug}/admin`;
  const html = layoutEmail(`
    <p>O manifestante do protocolo <strong>${protocolo}</strong> enviou uma nova mensagem.</p>
    <p><a href="${url}">Acessar o painel</a> para responder.</p>
  `);

  await Promise.all(
    emails.map((to) => enviarEmail({ to, subject: `Nova mensagem — ${protocolo}`, html }))
  );
}

export async function notificarManifestanteResposta(
  tenantSlug: string,
  manifestacaoId: string,
  protocolo: string
) {
  const supabase = createServiceClient();
  const { data: identidade } = await supabase
    .from("manifestante_identidade")
    .select("email")
    .eq("manifestacao_id", manifestacaoId)
    .maybeSingle();

  if (!identidade?.email) return;

  const url = `${getBaseUrl()}/${tenantSlug}/consultar`;
  const html = layoutEmail(`
    <p>O comitê respondeu à sua manifestação (protocolo <strong>${protocolo}</strong>).</p>
    <p><a href="${url}">Acesse a consulta</a> com seu protocolo e código de acesso para ler a resposta.</p>
  `);

  await enviarEmail({ to: identidade.email, subject: `Resposta à sua manifestação — ${protocolo}`, html });
}

export async function enviarConfirmacaoProtocolo(
  tenantSlug: string,
  email: string,
  protocolo: string,
  codigo: string
) {
  const url = `${getBaseUrl()}/${tenantSlug}/consultar`;
  const html = layoutEmail(`
    <p>Sua manifestação foi registrada. Guarde os dados abaixo — são a forma de acompanhar o caso.</p>
    <p><strong>Protocolo:</strong> ${protocolo}<br>
    <strong>Código de acesso:</strong> ${codigo}</p>
    <p><a href="${url}">Acompanhar manifestação</a></p>
  `);

  await enviarEmail({ to: email, subject: `Confirmação de registro — ${protocolo}`, html });
}
