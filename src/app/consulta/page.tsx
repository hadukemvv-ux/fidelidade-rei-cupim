'use client';import { useState } from 'react';
import Image from 'next/image';export default function Consultar() {
  const [telefone, setTelefone] = useState('');
  const [resultado, setResultado] = useState<{
    nivel: string;
    pontos: number;
    cashback: number;
    tickets: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);  async function buscar() {
    const tel = telefone.replace(/\D/g, '').trim();if (!tel) {
  setErro('Informe o telefone.');
  return;
}
if (tel.length < 10) {
  setErro('Telefone deve ter pelo menos 10 dígitos (com DDD).');
  return;
}

setLoading(true);
setErro(null);
setResultado(null);

try {
  const response = await fetch(`/api/consultar?telefone=${tel}`);
  const data = await response.json();

  if (!response.ok) {
    setErro(data?.error || 'Erro ao consultar.');
    setLoading(false);
    return;
  }

  setResultado({
    nivel: data.nivel,
    pontos: data.pontos,
    cashback: data.cashback,
    tickets: data.tickets,
  });
} catch (e) {
  console.error(e);
  setErro('Erro de conexão. Tente novamente.');
}

setLoading(false);  }  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') buscar();
  }  // “Badge” de cor por nível (visual)
  const nivelBadge =
    resultado?.nivel === 'Ouro'
      ? 'bg-[#F4A261]/20 text-[#F4A261] border-[#F4A261]/40'
      : resultado?.nivel === 'Prata'
      ? 'bg-white/10 text-white border-white/20'
      : 'bg-[#E63946]/15 text-[#ffd7d7] border-[#E63946]/30';  return (
    <main className="h-screen bg-[#2D1810] text-white overflow-hidden">
      {/* Fundo com “glow” quente */}
      <div className="fixed inset-0 pointer-events-none">
  <div className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#E63946]/25 blur-3xl" />
  <div className="absolute top-20 right-[-80px] h-64 w-64 rounded-full bg-[#F4A261]/20 blur-3xl" />
  <div className="absolute bottom-[-120px] left-[-80px] h-64 w-64 rounded-full bg-black/30 blur-3xl" />
</div>  <div className="relative mx-auto flex h-full w-full max-w-md flex-col px-3 py-8 md:px-4 md:py-10">
    {/* Header */}
    <header className="flex flex-col items-center text-center">
      <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-black/20 ring-1 ring-white/10">
        <Image
          src="/logo.png"
          alt="Churrascaria O Rei do Cupim"
          fill
          className="object-contain p-1"
          priority
        />
      </div>

      <p className="mt-4 text-xs tracking-[0.3em] text-white/70">
        CHURRASCARIA
      </p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
        O Rei do Cupim
      </h1>
      <p className="mt-2 text-sm text-white/70">
        Programa de fidelidade — consulte seus pontos, cashback e tickets.
      </p>
    </header>

    {/* Card principal */}
    <section className="mt-8 rounded-2xl bg-white/5 p-4 shadow-xl ring-1 ring-white/10 backdrop-blur">
      <label className="text-sm text-white/80">Telefone com DDD</label>

      <div className="mt-2 flex gap-2">
        <input
          type="tel"
          inputMode="numeric"
          placeholder="Ex.: 91999999999"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[#F4A261]/60 focus:ring-2 focus:ring-[#F4A261]/25"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <button
          onClick={buscar}
          disabled={loading}
          className="rounded-xl bg-[#E63946] px-5 py-3 font-semibold text-white shadow-lg shadow-[#E63946]/20 transition hover:bg-[#ff3f4f] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? '...' : 'OK'}
        </button>
      </div>

      <p className="mt-2 text-xs text-white/50">
        Dica: digite apenas números. Você pode apertar Enter para consultar.
      </p>

      {erro && (
        <div className="mt-4 rounded-xl border border-[#E63946]/30 bg-[#E63946]/10 p-3">
          <p className="text-sm text-[#ffd7d7]">{erro}</p>
        </div>
      )}
    </section>

    {/* Resultado */}
    {resultado && (
      <section className="mt-6 rounded-2xl bg-white/5 p-5 shadow-xl ring-1 ring-white/10 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">Resumo</h2>
          <span className={`rounded-full border px-3 py-1 text-xs ${nivelBadge}`}>
            {resultado.nivel}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-white/70">Pontos acumulados</span>
            <span className="text-xl font-bold">
              {resultado.pontos.toLocaleString('pt-BR')}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-white/70">Cashback disponível</span>
            <span className="text-xl font-bold text-[#7CFFB2]">
              R$ {resultado.cashback.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white/70">Tickets de sorteio</span>
            <span className="text-xl font-bold">
              {resultado.tickets.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="mt-6">
  <button onClick={() => window.location.href = '/resgate'} className="w-full rounded-xl bg-[#F4A261] py-3 font-semibold text-[#2D1810] shadow-lg shadow-[#F4A261]/20 transition hover:bg-[#ffbc7a]">
    Resgatar benefícios agora
  </button>
</div>
          <p className="text-xs text-white/60">
            Os benefícios variam por nível. A pontuação pode expirar por inatividade conforme as regras do programa.
          </p>
        </div>
      </section>
    )}

    {/* Rodapé */}
    <footer className="mt-auto pt-10 text-center">
      <p className="text-xs text-white/40">
        © {new Date().getFullYear()} Churrascaria O Rei do Cupim
      </p>
    </footer>
  </div>
</main>  );
}
