import Link from 'next/link';

const nextSteps = [
  {
    href: '/admin/operadores',
    title: 'Acessos da equipe',
    description: 'Cadastre cada pessoa por e-mail, defina o papel e suspenda o acesso quando necessário.',
    action: 'Abrir acessos',
  },
  {
    href: '/admin/roleta',
    title: 'Roleta V2',
    description: 'Configure os prêmios e revise as regras antes de liberar a operação com QR Code.',
    action: 'Abrir Roleta V2',
  },
  {
    href: '/admin/auditoria',
    title: 'Auditoria',
    description: 'Consulte ações administrativas e operacionais registradas pelo fluxo novo.',
    action: 'Consultar auditoria',
  },
];

export default function AdminGarconsLegadoPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-amber-300/40 bg-amber-50 p-6 text-slate-900">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-amber-800">Operação atualizada</span>
        <h2 className="mt-2 text-2xl font-black">O antigo controle de garçons está pausado.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
          Ele liberava a roleta por senhas previsíveis e criava um ranking que não comprova uma venda. Por segurança e para evitar liberações indevidas, não há mais cadastro, senha, ranking ou desbloqueio nessa área.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">Como a equipe vai operar daqui para frente</h3>
        <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
          <li><strong>1. Acesso individual:</strong> cada caixa, gestor ou administrador terá sua própria conta e permissão.</li>
          <li><strong>2. QR com sessão:</strong> a Roleta V2 só poderá ser liberada por uma sessão vinculada à venda aprovada.</li>
          <li><strong>3. Rastreabilidade:</strong> ações relevantes ficam no painel de auditoria, sem expor telefones e IPs em telas de rotina.</li>
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Próximos módulos operacionais">
        {nextSteps.map((step) => (
          <Link key={step.href} href={step.href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-500 hover:shadow-md">
            <h3 className="font-bold text-slate-900">{step.title}</h3>
            <p className="mt-2 min-h-20 text-sm leading-6 text-slate-600">{step.description}</p>
            <span className="mt-4 inline-block text-sm font-bold text-amber-700">{step.action} →</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
