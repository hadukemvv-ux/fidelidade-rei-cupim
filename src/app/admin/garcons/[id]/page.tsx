import Link from 'next/link';

export default function PerfilGarcomLegadoPage() {
  return (
    <div className="rounded-2xl border border-amber-300/40 bg-amber-50 p-6 text-slate-900">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-amber-800">Perfil antigo indisponível</span>
      <h2 className="mt-2 text-2xl font-black">Os perfis de garçons foram desativados.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
        Essa página dependia do controle antigo por senha e exibia dados técnicos que não são necessários para a rotina. A equipe e suas permissões agora são administradas por contas individuais.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/admin/operadores" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Gerenciar acessos</Link>
        <Link href="/admin/garcons" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800">Voltar</Link>
      </div>
    </div>
  );
}
