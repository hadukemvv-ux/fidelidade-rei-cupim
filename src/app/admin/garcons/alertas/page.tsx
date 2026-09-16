import Link from 'next/link';

export default function AlertasGarconsLegadoPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-amber-300/40 bg-amber-50 p-6 text-slate-900">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-amber-800">Painel antigo pausado</span>
        <h2 className="mt-2 text-2xl font-black">Estes alertas não eram uma proteção confiável.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
          O painel classificava pessoas por pontuações fixas, expunha telefone e IP e oferecia um “desbloqueio” que apenas criava outro registro. Ele foi retirado da operação para não gerar falsa sensação de segurança nem revelar dados pessoais desnecessariamente.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">Onde verificar algo suspeito agora</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Link href="/admin/auditoria" className="rounded-xl border border-slate-200 p-4 transition hover:border-amber-500">
            <h4 className="font-bold text-slate-900">Auditoria operacional</h4>
            <p className="mt-1 text-sm leading-6 text-slate-600">Veja quem realizou liberações, alterações e validações no fluxo vigente.</p>
            <span className="mt-3 inline-block text-sm font-bold text-amber-700">Abrir auditoria →</span>
          </Link>
          <Link href="/admin/seguranca" className="rounded-xl border border-slate-200 p-4 transition hover:border-amber-500">
            <h4 className="font-bold text-slate-900">Privacidade e incidentes</h4>
            <p className="mt-1 text-sm leading-6 text-slate-600">Contenha uma ocorrência, preserve evidências e registre as decisões responsáveis.</p>
            <span className="mt-3 inline-block text-sm font-bold text-amber-700">Abrir segurança →</span>
          </Link>
        </div>
      </section>

      <p className="text-sm leading-6 text-slate-600">
        Os registros técnicos antigos continuam preservados apenas para revisão controlada e limpeza planejada; eles não são mais servidos por esta tela ou pelas rotas antigas.
      </p>
    </div>
  );
}
