'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function Resgate() {
  const [telefone, setTelefone] = useState('');
  const [resultado, setResultado] = useState<{
    nivel: string;
    pontos: number;
    cashback: number;
    tickets: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cupom, setCupom] = useState<string | null>(null);

  // Função para consultar os benefícios
  async function buscar() {
    const tel = telefone.replace(/\D/g, '').trim();

    if (!tel) {
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
    setCupom(null);

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

    setLoading(false);
  }

  // Função para lidar com tecla Enter
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      buscar();
    }
  }

  // Função para resgatar (chama a API /api/resgate)
  async function resgatar(tipo: 'pontos' | 'cashback' | 'frete', valorDesconto: number) {
    if (!resultado) {
      setErro('Consulte o telefone primeiro.');
      return;
    }

    setLoading(true);
    setErro(null);
    setCupom(null);

    try {
      const response = await fetch('/api/resgate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone: telefone.replace(/\D/g, '').trim(),
          tipo,
          valorDesconto,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || 'Erro ao resgatar.');
        setLoading(false);
        return;
      }

      setCupom(data.codigo);
      setResultado(data.atualizado);
    } catch (e) {
      console.error(e);
      setErro('Erro de conexão. Tente novamente.');
    }

    setLoading(false);
  }

  // Badge de cor por nível
  const nivelBadge =
    resultado?.nivel === 'Ouro'
      ? 'bg-[#F4A261]/20 text-[#F4A261] border-[#F4A261]/40'
      : resultado?.nivel === 'Prata'
      ? 'bg-white/10 text-white border-white/20'
      : 'bg-[#E63946]/15 text-[#ffd7d7] border-[#E63946]/30';

  return (
    <main className="min-h-screen bg-[#2D1810] text-white overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#E63946]/25 blur-3xl" />
        <div className="absolute top-20 right-[-80px] h-64 w-64 rounded-full bg-[#F4A261]/20 blur-3xl" />
        <div className="absolute bottom-[-120px] left-[-80px] h-64 w-64 rounded-full bg-black/30 blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-md flex-col px-3 py-8 md:px-4 md:py-10">
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
            Resgate seus benefícios — pontos, cashback e tickets.
          </p>
        </header>

        {/* Input de telefone */}
        <section className="mt-8 rounded-2xl bg-white/5 p-4 shadow-xl ring-1 ring-white/10 backdrop-blur">
          <label className="text-sm text-white/80">Telefone com DDD</label>

          <div className="mt-2 flex gap-2">
            <input
  type="tel"
  inputMode="numeric"
  pattern="[0-9]*"
  maxLength={11}  // Limita a exatamente 11 dígitos
  placeholder="Ex.: 91999999999"
  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[#F4A261]/60 focus:ring-2 focus:ring-[#F4A261]/25"
  value={telefone}
  onChange={(e) => {
    const value = e.target.value.replace(/\D/g, '');  // Só números
    if (value.length <= 11) {
      setTelefone(value);
    }
  }}
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
{cupom && (
      <div className="mt-6 rounded-2xl border border-[#F4A261]/30 bg-[#F4A261]/10 p-5 text-center">
        <p className="text-lg font-bold text-[#F4A261]">
          Cupom gerado com sucesso!
        </p>
        <p className="text-2xl font-extrabold mt-2 text-[#F4A261]">
          {cupom}
        </p>
        <p className="text-sm text-white/80 mt-2">
          Mostre este código no caixa para aplicar o desconto.
        </p>
      </div>
    )}
        {/* Resultado e opções de resgate */}
        {resultado && (
  <section className="mt-6 rounded-2xl bg-white/5 p-5 shadow-xl ring-1 ring-white/10 backdrop-blur">
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-lg font-semibold">Resumo</h2>
      <span className={`rounded-full border px-3 py-1 text-xs ${nivelBadge}`}>
        {resultado.nivel || 'Bronze'}
      </span>
    </div>

    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <span className="text-white/70">Pontos acumulados</span>
        <span className="text-xl font-bold">
          {(resultado.pontos || 0).toLocaleString('pt-BR')}
        </span>
      </div>

      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <span className="text-white/70">Cashback disponível</span>
        <span className="text-xl font-bold text-[#7CFFB2]">
          R$ {(resultado.cashback || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-white/70">Tickets de sorteio</span>
        <span className="text-xl font-bold">
          {(resultado.tickets || 0).toLocaleString('pt-BR')}
        </span>
      </div>
    </div>

    <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-white/60">
        Resgate seus benefícios abaixo. Sorteios mensais todo dia 15.
      </p>
    </div>

    {/* Opções de resgate */}
    <div className="mt-6 space-y-6">
      {/* Taxa de Entrega Grátis (em primeiro) */}
      <div className="bg-white/5 p-5 rounded-2xl shadow-xl ring-1 ring-white/10 backdrop-blur">
        <h3 className="text-xl font-bold mb-4 text-center">Taxa de Entrega Grátis</h3>
        <p className="text-sm text-white/70 text-center mb-4">
          Resgate frete grátis na próxima compra
        </p>

        <button
          onClick={() => resgatar('frete', 0)}
          disabled={loading || resultado.pontos < 300}
          className="w-full rounded-xl bg-[#E63946] py-3 text-white font-semibold transition hover:bg-[#ff3f4f] disabled:opacity-60"
        >
          300 pontos → Taxa de entrega grátis
        </button>
      </div>

      {/* Resgate com Pontos */}
      <div className="bg-white/5 p-5 rounded-2xl shadow-xl ring-1 ring-white/10 backdrop-blur">
        <h3 className="text-xl font-bold mb-4 text-center">Resgate com Pontos</h3>
        <p className="text-sm text-white/70 text-center mb-4">
          Escolha o desconto que deseja
        </p>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => resgatar('pontos', 5)}
            disabled={loading || resultado.pontos < 100}
            className="rounded-xl bg-[#E63946] py-3 text-white font-semibold transition hover:bg-[#ff3f4f] disabled:opacity-60"
          >
            R$ 5 de desconto (100 pontos)
          </button>

          <button
            onClick={() => resgatar('pontos', 10)}
            disabled={loading || resultado.pontos < 200}
            className="rounded-xl bg-[#E63946] py-3 text-white font-semibold transition hover:bg-[#ff3f4f] disabled:opacity-60"
          >
            R$ 10 de desconto (200 pontos)
          </button>

          <button
            onClick={() => resgatar('pontos', 15)}
            disabled={loading || resultado.pontos < 300}
            className="rounded-xl bg-[#E63946] py-3 text-white font-semibold transition hover:bg-[#ff3f4f] disabled:opacity-60"
          >
            R$ 15 de desconto (300 pontos)
          </button>

          <button
            onClick={() => resgatar('pontos', 25)}
            disabled={loading || resultado.pontos < 500}
            className="rounded-xl bg-[#E63946] py-3 text-white font-semibold transition hover:bg-[#ff3f4f] disabled:opacity-60"
          >
            R$ 25 de desconto (500 pontos)
          </button>

          <button
            onClick={() => resgatar('pontos', 50)}
            disabled={loading || resultado.pontos < 1000}
            className="rounded-xl bg-[#E63946] py-3 text-white font-semibold transition hover:bg-[#ff3f4f] disabled:opacity-60"
          >
            R$ 50 de desconto (1.000 pontos)
          </button>

          <button
            onClick={() => resgatar('pontos', 100)}
            disabled={loading || resultado.pontos < 2000}
            className="rounded-xl bg-[#E63946] py-3 text-white font-semibold transition hover:bg-[#ff3f4f] disabled:opacity-60"
          >
            R$ 100 de desconto (2.000 pontos)
          </button>
        </div>
      </div>

      {/* Resgate com Cashback */}
      <div className="bg-white/5 p-5 rounded-2xl shadow-xl ring-1 ring-white/10 backdrop-blur">
        <h3 className="text-xl font-bold mb-4 text-center">Resgate com Cashback</h3>
        <p className="text-sm text-white/70 text-center mb-4">
          Use metade do cashback disponível
        </p>

        <button
          onClick={() => resgatar('cashback', resultado.cashback / 2)}
          disabled={loading || resultado.cashback <= 0}
          className="w-full rounded-xl bg-[#E63946] py-3 text-white font-semibold transition hover:bg-[#ff3f4f] disabled:opacity-60"
        >
          Resgatar R$ {resultado.cashback > 0 ? (resultado.cashback / 2).toFixed(2) : '0,00'} (metade disponível)
        </button>
      </div>
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
    </main>
  );
}