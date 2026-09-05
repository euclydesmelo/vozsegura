import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { listarAnexosComUrl } from "@/lib/storage";
import { listarMembrosComEmail } from "@/lib/tenantMembers";
import { CasoPainel } from "./caso-painel";

export default async function CasoPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: slug, id } = await params;
  const { tenant, role } = await getAdminContext(slug);
  const supabase = await createClient();

  const { data: caso } = await supabase
    .from("manifestacoes")
    .select("*, tipos_manifestacao(id, nome)")
    .eq("id", id)
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (!caso) notFound();

  // Trilha de auditoria de acesso — gatilho de banco não cobre SELECT, então
  // toda abertura de um caso é registrada explicitamente aqui. A mesma
  // função também avança "recebida" -> "em_triagem" na primeira vez que um
  // admin/comitê abre o caso (automação do fluxo de atendimento) — como já
  // buscamos `caso` acima, refletimos aqui o status pós-avanço para a tela
  // não mostrar um status que acabou de ficar desatualizado.
  await supabase.rpc("registrar_visualizacao", { target_manifestacao: id });
  const { data: statusAtual } = await supabase
    .from("manifestacoes")
    .select("status, atribuido_a")
    .eq("id", id)
    .single();
  if (statusAtual) {
    caso.status = statusAtual.status;
    caso.atribuido_a = statusAtual.atribuido_a;
  }

  const [
    { data: categorias },
    { data: mensagens },
    identidadeResult,
    historicoResult,
    anexos,
    { data: notas },
    membros,
  ] = await Promise.all([
    supabase.from("categorias").select("*").eq("tenant_id", tenant.id).eq("ativo", true).order("nome"),
    supabase.from("mensagens").select("*").eq("manifestacao_id", id).order("created_at"),
    role === "admin" && caso.identificado
      ? supabase
          .from("manifestante_identidade")
          .select("nome, email, telefone")
          .eq("manifestacao_id", id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    role === "admin"
      ? supabase
          .from("auditoria")
          .select("acao, detalhe, created_at")
          .eq("manifestacao_id", id)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: null }),
    listarAnexosComUrl(id),
    supabase.from("notas_internas").select("*").eq("manifestacao_id", id).order("created_at"),
    listarMembrosComEmail(tenant.id),
  ]);

  return (
    <div>
      <Link href={`/${slug}/admin`} className="text-sm text-muted hover:text-accent">
        ← Voltar aos casos
      </Link>
      <h1 className="font-serif text-2xl font-semibold mt-2 mb-6 font-mono">{caso.protocolo}</h1>
      <CasoPainel
        tenantSlug={slug}
        tenantId={tenant.id}
        caso={caso}
        categorias={categorias ?? []}
        mensagens={mensagens ?? []}
        identidade={identidadeResult.data}
        historico={historicoResult.data ?? []}
        anexos={anexos}
        notas={notas ?? []}
        membros={membros}
      />
    </div>
  );
}
