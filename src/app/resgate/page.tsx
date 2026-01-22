'use client';

import { useState } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';

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
  const [showMorePontos, setShowMorePontos] = useState(false);
const [showMoreCashback, setShowMoreCashback] = useState(false);

  // Função para consultar os benefícios
  async function buscar() {
    const tel = telefone.replace(/\D/g, '').trim();

    if (!tel) {
      setErro('Informe o telefone.');
      return;
    }
    if (tel.length !== 11) {
      setErro('Telefone deve ter exatamente 11 dígitos (DDD + número).');
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

      // Rola até o cupom e centraliza na tela
setTimeout(() => {
  const cupomElement = document.getElementById('cupom-box');
  if (cupomElement) {
    cupomElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    cupomElement.classList.add('animate-pulse');
    setTimeout(() => cupomElement.classList.remove('animate-pulse'), 3000);
  }
}, 100); // pequeno delay pra o DOM atualizar
    } catch (e) {
      console.error(e);
      setErro('Erro de conexão. Tente novamente.');
    }

    setLoading(false);
  }
// Função para calcular progresso e próximo nível
function getProgressInfo(pontos: number) {
  const thresholds = [
    { nivel: 'Prata', pontosNecessarios: 250 },
    { nivel: 'Ouro', pontosNecessarios: 1200 },
    { nivel: 'Rei do Cupim', pontosNecessarios: 4300 },
  ];

  let proximoNivel = 'Rei do Cupim';
  let pontosProximo = 4300;
  let progresso = 100; // já é Rei

  for (const thresh of thresholds) {
    if (pontos < thresh.pontosNecessarios) {
      proximoNivel = thresh.nivel;
      pontosProximo = thresh.pontosNecessarios;
      progresso = Math.min(100, Math.floor((pontos / thresh.pontosNecessarios) * 100));
      break;
    }
  }

  const faltam = Math.max(0, pontosProximo - pontos);

  return {
    progresso,
    proximoNivel,
    pontosProximo,
    faltam,
    isRei: pontos >= 4300,
  };
}
  // Badge de cor por nível
  const nivelBadge = () => {
  if (resultado?.nivel === 'Rei do Cupim') {
    return 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black border-[#FFD700]/70 shadow-xl shadow-[#FFD700]/40 font-bold';
  }
  if (resultado?.nivel === 'Ouro') {
    return 'bg-[#F4A261]/20 text-[#F4A261] border-[#F4A261]/40';
  }
  if (resultado?.nivel === 'Prata') {
    return 'bg-white/10 text-white border-white/20';
  }
  return 'bg-[#E63946]/15 text-[#ffd7d7] border-[#E63946]/30'; // Bronze
};

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
              maxLength={11}
              placeholder="Ex.: 91999999999"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[#F4A261]/60 focus:ring-2 focus:ring-[#F4A261]/25"
              value={telefone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
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
            Dica: digite apenas números (11 dígitos com DDD). Você pode apertar Enter para consultar.
          </p>

          {erro && (
            <div className="mt-4 rounded-xl border border-[#E63946]/30 bg-[#E63946]/10 p-3">
              <p className="text-sm text-[#ffd7d7]">{erro}</p>
            </div>
          )}
        </section>

        {/* Cupom gerado (no topo, bem visível) */}
        {cupom && (
          <div id="cupom-box" className="mt-6 rounded-2xl border-2 border-[#F4A261] bg-[#F4A261]/20 p-6 text-center shadow-2xl animate-pulse">
            <p className="text-2xl font-bold text-[#F4A261] mb-2">Cupom gerado com sucesso!</p>
            <p className="text-4xl font-extrabold text-[#F4A261] tracking-wider mb-4">
              {cupom}
            </p>

            {/* QR Code */}
            <div className="my-6 flex justify-center">
              <QRCodeSVG
  value={`https://fidelidade-cupim.vercel.app/validar?cupom=${cupom}&telefone=${telefone.replace(/\D/g, '')}`}
  size={200}
  bgColor="#2D1810"
  fgColor="#F4A261"
  level="H"
/>
            </div>

            <p className="text-lg text-white/90">
              Mostre este QR Code ou código no caixa para validar e aplicar o desconto.
            </p>
            <p className="text-sm text-white/70 mt-4">
              O benefício já foi reduzido do seu saldo.
            </p>
          </div>
        )}

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
{/* Barra de Progresso para Próximo Nível */}
<div className="mt-6 bg-black/30 p-4 rounded-xl border border-white/10">
  {(() => {
    const info = getProgressInfo(resultado.pontos);

    if (info.isRei) {
      return (
        <div className="text-center">
          <p className="text-lg font-bold text-[#FFD700] flex items-center justify-center gap-2">
            Você é o Rei do Cupim! 👑
          </p>
          <p className="text-sm text-white/70 mt-1">
            Parabéns! Benefícios exclusivos ativados.
          </p>
        </div>
      );
    }

    return (
      <>
        <p className="text-sm text-white/80 mb-2">
          Progresso para {info.proximoNivel}:
        </p>
        <div className="relative h-5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-gradient-to-r from-[#E63946] to-[#F4A261] transition-all duration-700 ease-out"
            style={{ width: `${info.progresso}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-white/70">
          <span>{resultado.pontos.toLocaleString('pt-BR')} pts</span>
          <span>
            {info.faltam > 0
              ? `Faltam ${info.faltam.toLocaleString('pt-BR')} pts`
              : 'Próximo nível alcançado!'}
          </span>
        </div>
      </>
    );
  })()}
</div>
            <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-white/60">
                Resgate seus benefícios abaixo. Sorteios mensais todo dia 15.
              </p>
            </div>

            {/* Opções de resgate */}
            <div className="mt-6 space-y-6">
              {/* Opção 1: Taxa de Entrega Grátis (em primeiro) */}
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

              {/* Opção 2: Resgate com Pontos */}
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

  {showMorePontos && (
    <>
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
    </>
  )}
</div>

{!showMorePontos && (
  <button
    onClick={() => setShowMorePontos(true)}
    className="mt-4 w-full rounded-xl border border-[#F4A261]/50 bg-transparent py-3 text-[#F4A261] font-semibold transition hover:bg-[#F4A261]/10"
  >
    Ver mais opções ▼
  </button>
)}
              </div>

              {/* Opção 3: Resgate com Cashback */}
              <div className="bg-white/5 p-5 rounded-2xl shadow-xl ring-1 ring-white/10 backdrop-blur">
                <h3 className="text-xl font-bold mb-4 text-center">Resgate com Cashback</h3>
                <p className="text-sm text-white/70 text-center mb-4">
                  Escolha o valor disponível
                </p>

                <div className="grid grid-cols-1 gap-3">
  <button
    onClick={() => resgatar('cashback', 5)}
    disabled={loading || resultado.cashback < 5}
    className="rounded-xl bg-[#E63946] py-3 text-white font-semibold transition hover:bg-[#ff3f4f] disabled:opacity-60"
  >
    R$ 5 de cashback (disponível: R$ {resultado.cashback.toFixed(2)})
  </button>

  <button
    onClick={() => resgatar('cashback', 10)}
    disabled={loading || resultado.cashback < 10}
    className="rounded-xl bg-[#E63946] py-3 text-white font-semibold transition hover:bg-[#ff3f4f] disabled:opacity-60"
  >
    R$ 10 de cashback (disponível: R$ {resultado.cashback.toFixed(2)})
  </button>

  <button
    onClick={() => resgatar('cashback', 15)}
    disabled={loading || resultado.cashback < 15}
    className="rounded-xl bg-[#E63946] py-3 text-white font-semibold transition hover:bg-[#ff3f4f] disabled:opacity-60"
  >
    R$ 15 de cashback (disponível: R$ {resultado.cashback.toFixed(2)})
  </button>

  {showMoreCashback && (
    <>
      <button
        onClick={() => resgatar('cashback', 25)}
        disabled={loading || resultado.cashback < 25}
        className="rounded-xl bg-[#E63946] py-3 text-white font-semibold transition hover:bg-[#ff3f4f] disabled:opacity-60"
      >
        R$ 25 de cashback (disponível: R$ {resultado.cashback.toFixed(2)})
      </button>

      <button
        onClick={() => resgatar('cashback', 50)}
        disabled={loading || resultado.cashback < 50}
        className="rounded-xl bg-[#E63946] py-3 text-white font-semibold transition hover:bg-[#ff3f4f] disabled:opacity-60"
      >
        R$ 50 de cashback (disponível: R$ {resultado.cashback.toFixed(2)})
      </button>
    </>
  )}
</div>

{!showMoreCashback && (
  <button
    onClick={() => setShowMoreCashback(true)}
    className="mt-4 w-full rounded-xl border border-[#F4A261]/50 bg-transparent py-3 text-[#F4A261] font-semibold transition hover:bg-[#F4A261]/10"
  >
    Ver mais opções ▼
  </button>
)}
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