import Image from "next/image";

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function IconShieldCheck({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/** Marca da Voz Segura — mesmo escudo do favicon, com barras de som no
 * lugar do check (nomeia o que o produto protege: uma voz). */
function IconMarca({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3z" />
      <path d="M9 12v3.5M12 8.5v7M15 11v4.5" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-border bg-surface">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-2">
          <Image src="/icon.svg" alt="" width={20} height={20} />
          <span className="font-serif font-semibold">Voz Segura</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-8 pt-16 pb-0">
        <div className="max-w-md text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-accent-soft text-accent flex items-center justify-center mx-auto">
            <IconMarca size={26} />
          </div>
          <h1 className="font-serif text-2xl font-semibold">
            Canal de manifestações e denúncias
          </h1>
          <p className="text-muted leading-relaxed">
            Cada empresa parceira tem seu próprio canal, com um endereço
            exclusivo. Se você recebeu esse link da sua empresa — por e-mail,
            mural, contrato ou site — use-o diretamente para registrar ou
            acompanhar uma manifestação.
          </p>
          <p className="text-sm text-muted">
            Não tem o link em mãos? Procure o RH, a área de compras/fornecedores
            ou o canal de comunicação interna da empresa com quem você se
            relaciona.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5 max-w-2xl w-full mt-14">
          <div className="card flex flex-col gap-2.5 text-accent">
            <IconLock />
            <p className="font-serif font-semibold text-sm text-foreground">Anônimo por padrão</p>
            <p className="text-xs text-muted leading-relaxed">
              Você não precisa se identificar para registrar ou acompanhar uma manifestação.
            </p>
          </div>
          <div className="card flex flex-col gap-2.5 text-accent">
            <IconClock />
            <p className="font-serif font-semibold text-sm text-foreground">Prazo acompanhável</p>
            <p className="text-xs text-muted leading-relaxed">
              Toda manifestação tem um prazo de resposta e um status visível a qualquer momento.
            </p>
          </div>
          <div className="card flex flex-col gap-2.5 text-accent">
            <IconShieldCheck />
            <p className="font-serif font-semibold text-sm text-foreground">Conforme a lei</p>
            <p className="text-xs text-muted leading-relaxed">
              Tratamento alinhado à LGPD e, quando aplicável, à Lei 14.457/2022.
            </p>
          </div>
        </div>

        <footer className="border-t border-border w-full mt-16 py-5 text-center">
          <p className="text-xs text-muted">
            Canal operado em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018).
          </p>
        </footer>
      </main>
    </div>
  );
}
