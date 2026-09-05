import "server-only";

type EnviarEmailInput = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Em produção (Vercel), define RESEND_API_KEY e o envio vai pela API do
 * Resend. Em desenvolvimento local, na ausência dessa variável, cai para
 * SMTP apontando para o Mailpit do Supabase local (nada é enviado de
 * verdade — só fica visível em http://127.0.0.1:55324).
 */
export async function enviarEmail({ to, subject, html }: EnviarEmailInput): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "Voz Segura <onboarding@resend.dev>";

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) console.error("Falha ao enviar e-mail via Resend:", error);
    return;
  }

  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "127.0.0.1",
    port: Number(process.env.SMTP_PORT ?? 55325),
    secure: false,
    ignoreTLS: true,
  });

  try {
    await transport.sendMail({ from, to, subject, html });
  } catch (err) {
    console.error("Falha ao enviar e-mail via SMTP local (Mailpit):", err);
  }
}

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
