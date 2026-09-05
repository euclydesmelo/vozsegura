import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Troca o token do e-mail de convite por uma sessão de verdade. Precisa ser
 * um Route Handler (não Server Component) porque só aqui o Next.js permite
 * gravar o cookie de sessão que o `verifyOtp` produz — um Server Component
 * não tem essa permissão, então o convite nunca "logaria" ninguém se essa
 * troca ficasse na própria página.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(`/${slug}/admin/aceitar-convite`, request.url));
    }
  }

  return NextResponse.redirect(
    new URL(`/${slug}/admin/login?erro=convite-invalido`, request.url)
  );
}
