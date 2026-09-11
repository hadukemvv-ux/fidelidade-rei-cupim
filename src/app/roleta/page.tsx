import Link from "next/link";

/**
 * A roleta legada foi retirada de operação até que a V2 esteja pronta.
 * A V2 usará QR temporário, sessão de uso único, consentimento opcional
 * e emissão de cupom auditável. Não reative esta página isoladamente.
 */
export default function RoletaPage() {
  return (
    <main className="operations-page min-h-screen bg-[#280404] px-6 py-16 text-white">
      <section className="mx-auto max-w-xl rounded-3xl border border-[#c5a059]/50 bg-[#1a0a0a] p-8 text-center shadow-2xl">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-[#c5a059]">Clube Cupim</p>
        <h1 className="text-3xl font-black">A Roleta do Rei está sendo preparada</h1>
        <p className="mt-5 leading-relaxed text-zinc-300">
          Estamos finalizando uma versão mais segura, com QR temporário, regras claras de prêmio e validação pelo caixa.
          Em breve ela estará disponível no restaurante.
        </p>
        <Link
          className="mt-8 inline-flex rounded-xl bg-[#e31e24] px-5 py-3 font-black transition hover:bg-[#c1191f]"
          href="/"
        >
          Voltar ao Clube Cupim
        </Link>
      </section>
    </main>
  );
}
