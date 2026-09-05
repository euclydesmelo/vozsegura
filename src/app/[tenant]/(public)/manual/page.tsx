import Link from "next/link";
import { getTenantBySlug } from "@/lib/tenant";

export default async function ManualPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-12">
      <header>
        <p className="text-xs uppercase tracking-wide text-muted font-mono mb-1">{tenant.nome}</p>
        <h1 className="font-serif text-2xl font-semibold mb-2">Manual do canal de ouvidoria</h1>
        <p className="text-muted">
          Como usar este canal — para quem manifesta e para o comitê de ética/compliance — e a
          base legal por trás de cada exigência.
        </p>
      </header>

      <nav className="card text-sm">
        <p className="text-xs uppercase tracking-wide text-muted font-mono mb-2">Nesta página</p>
        <ol className="space-y-1">
          <li><a className="text-accent hover:underline" href="#manifestante">1. Para quem faz uma manifestação</a></li>
          <li><a className="text-accent hover:underline" href="#comite">2. Para o comitê</a></li>
          <li><a className="text-accent hover:underline" href="#legal">3. Base legal</a></li>
          <li><a className="text-accent hover:underline" href="#faq">4. Perguntas frequentes</a></li>
        </ol>
      </nav>

      <section id="manifestante" className="space-y-4">
        <h2 className="font-serif text-xl font-semibold">1. Para quem faz uma manifestação</h2>

        <div>
          <h3 className="font-medium mb-1">Registrar</h3>
          <p className="text-sm text-muted">
            Acesse <Link href={`/${slug}/manifestar`} className="text-accent hover:underline">/{slug}/manifestar</Link>.
            Não é preciso login. Escolha o tipo (denúncia, reclamação, sugestão, elogio ou
            solicitação de titular de dados), descreva o ocorrido com o máximo de detalhe possível
            e, se quiser, anexe evidências (imagem, PDF ou Word, até 3 arquivos de 10MB). Decidir
            se identifica ou não é sempre sua escolha.
          </p>
        </div>

        <div>
          <h3 className="font-medium mb-1">Protocolo e código de acesso</h3>
          <p className="text-sm text-muted">
            Ao enviar, você recebe um <strong>protocolo</strong> (identifica o caso, pode ser
            citado livremente) e um <strong>código de acesso</strong> (o segredo — sem ele,
            ninguém consegue ler o conteúdo do seu caso, nem quem descobrir o protocolo). Os dois
            juntos aparecem <strong>uma única vez</strong>, na tela de confirmação. Se você se
            identificou e informou e-mail, mandamos os dois por e-mail também, como segunda via.
            Se você ficou anônimo, não existe segunda via — perdeu, perdeu.
          </p>
        </div>

        <div>
          <h3 className="font-medium mb-1">Acompanhar e responder</h3>
          <p className="text-sm text-muted">
            Em <Link href={`/${slug}/consultar`} className="text-accent hover:underline">/{slug}/consultar</Link>,
            informe protocolo e código para ver o status e trocar mensagens com o comitê — sem
            revelar sua identidade, mesmo que você tenha se identificado no início.
          </p>
        </div>
      </section>

      <section id="comite" className="space-y-4">
        <h2 className="font-serif text-xl font-semibold">2. Para o comitê</h2>

        <div>
          <h3 className="font-medium mb-1">Acesso</h3>
          <p className="text-sm text-muted">
            Entre em <Link href={`/${slug}/admin/login`} className="text-accent hover:underline">/{slug}/admin/login</Link> com
            e-mail e senha. Um administrador pode convidar novos membros em{" "}
            <span className="font-mono text-xs">/admin/usuários</span>, com um de três papéis:
            <strong> admin</strong> (gerencia categorias, usuários e configurações, além de ver a
            identidade de manifestantes identificados), <strong>comitê</strong> (trata casos, não
            vê identidade) e <strong>leitor</strong> (só visualiza, útil para auditoria interna).
          </p>
        </div>

        <div>
          <h3 className="font-medium mb-1">Tratar um caso</h3>
          <p className="text-sm text-muted">
            Abra o caso pela lista, classifique por categoria e criticidade, responda ao
            manifestante pela thread pública ou registre uma <strong>nota interna</strong> (nunca
            visível ao manifestante) para deliberar com outros membros do comitê. Para encerrar
            (status Concluída), é obrigatório registrar um parecer descrevendo o que foi apurado e
            quais medidas foram tomadas.
          </p>
        </div>

        <div>
          <h3 className="font-medium mb-1">Categorias, indicadores e retenção</h3>
          <p className="text-sm text-muted">
            Categorias (com prazo de resposta próprio) só podem ser inativadas, nunca excluídas —
            um caso antigo continua referenciando a categoria que usou. Em{" "}
            <span className="font-mono text-xs">/admin/indicadores</span> acompanhe taxa de
            resolução, tempo médio de resposta e recorrência por categoria. Em{" "}
            <span className="font-mono text-xs">/admin/configuracoes</span>, defina o prazo de
            resposta padrão, os dados do encarregado (DPO) e o prazo de retenção — passado esse
            prazo, casos concluídos ficam elegíveis para anonimização manual.
          </p>
        </div>
      </section>

      <section id="legal" className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">3. Base legal</h2>
        <p className="text-sm text-muted">
          O que este canal implementa não é só boa prática — em vários pontos é exigência legal
          direta, independente de qualquer certificação ou incentivo:
        </p>
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted font-mono">
              <tr>
                <th className="px-4 py-3">Norma</th>
                <th className="px-4 py-3">O que exige</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">Decreto 11.129/2022, art. 57</td>
                <td className="px-4 py-3 text-muted">
                  Canal de denúncias amplamente divulgado, com mecanismo de apuração e proteção ao
                  denunciante de boa-fé — regulamenta a Lei Anticorrupção (12.846/2013).
                </td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">LGPD, art. 18 e 41</td>
                <td className="px-4 py-3 text-muted">
                  Canal para o titular exercer acesso, correção, eliminação e portabilidade de
                  dados; encarregado (DPO) com contato divulgado publicamente.
                </td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">Lei 14.457/2022</td>
                <td className="px-4 py-3 text-muted">
                  Empresas com CIPA devem ter procedimento para receber, apurar e sancionar
                  denúncias de assédio, com garantia de anonimato.
                </td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">ISO 37002:2021</td>
                <td className="px-4 py-3 text-muted">
                  Não é lei — é a referência internacional de sistema de gestão de denúncias
                  (confiança, imparcialidade, proteção) usada para desenhar os indicadores deste
                  canal.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          Para o contexto completo — incluindo o modelo de negócio e a arquitetura do canal — veja
          o documento de plano compartilhado com a gestora deste canal.
        </p>
      </section>

      <section id="faq" className="space-y-4">
        <h2 className="font-serif text-xl font-semibold">4. Perguntas frequentes</h2>

        <div>
          <h3 className="font-medium mb-1">Perdi meu protocolo ou código. E agora?</h3>
          <p className="text-sm text-muted">
            Se você se identificou com e-mail, procure o e-mail de confirmação. Se ficou anônimo,
            infelizmente não há como recuperar — é por isso que a tela de confirmação avisa para
            anotar antes de sair da página.
          </p>
        </div>

        <div>
          <h3 className="font-medium mb-1">Quanto tempo até eu ter uma resposta?</h3>
          <p className="text-sm text-muted">
            Cada categoria tem um prazo próprio (visível para o comitê); sem categoria, vale o
            prazo padrão do canal. Um caso além do prazo aparece destacado como atrasado para o
            comitê.
          </p>
        </div>

        <div>
          <h3 className="font-medium mb-1">Quem vê que fui eu quem denunciou?</h3>
          <p className="text-sm text-muted">
            Se você não se identificar, ninguém — nem o comitê, nem o administrador. Se você se
            identificar, só o administrador vê seus dados de contato; o restante do comitê trata o
            caso sem saber quem você é.
          </p>
        </div>

        <div>
          <h3 className="font-medium mb-1">Posso usar este canal para pedir meus dados (LGPD)?</h3>
          <p className="text-sm text-muted">
            Sim — escolha &ldquo;Solicitação de titular de dados (LGPD)&rdquo; como tipo de
            manifestação, ou veja a{" "}
            <Link href={`/${slug}/privacidade`} className="text-accent hover:underline">
              Política de Privacidade
            </Link>{" "}
            para o contato direto do encarregado.
          </p>
        </div>
      </section>
    </div>
  );
}
