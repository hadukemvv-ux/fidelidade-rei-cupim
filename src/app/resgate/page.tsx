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
console.log('Dados da API para este telefone:', data);
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

  // Função para resgatar
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
console.log('O que chegou da API:', data);
      if (!response.ok) {
        setErro(data.error || 'Erro ao resgatar.');
        setLoading(false);
        return;
      }

      setCupom(data.codigo);
      setResultado(data.atualizado);

      setTimeout(() => {
        const cupomElement = document.getElementById('cupom-box');
        if (cupomElement) {
          cupomElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          cupomElement.classList.add('animate-pulse');
          setTimeout(() => cupomElement.classList.remove('animate-pulse'), 3000);
        }
      }, 100);
    } catch (e) {
      console.error(e);
      setErro('Erro de conexão. Tente novamente.');
    }

    setLoading(false);
  }

  // Função corrigida: agora usa o nível atual + pontos
  function getProgressInfo(nivel: string, pontos: number) {
    const niveis = [
      { nome: 'Prata',       proximo: 'Ouro',          threshold: 250   },
      { nome: 'Ouro',        proximo: 'Rei do Cupim',  threshold: 1200  },
      { nome: 'Rei do Cupim', proximo: null,           threshold: 4300  },
    ];

    const nivelAtual = niveis.find(n => n.nome === nivel) || niveis[0];

    if (!nivelAtual.proximo) {
      // Já é Rei do Cupim
      return {
        progresso: 100,
        proximoNivel: null,
        pontosProximo: null,
        faltam: 0,
        isRei: true,
      };
    }

    // Pontos mínimos para entrar no nível atual
    const pontosMinimosNivel = 
      nivel === 'Prata' ? 0 :
      nivel === 'Ouro'  ? 250 : 1200;

    const pontosNoNivel = Math.max(0, pontos - pontosMinimosNivel);
    const pontosNecessariosNesteNivel = nivelAtual.threshold - pontosMinimosNivel;

    const progresso = Math.min(
      100,
      Math.floor((pontosNoNivel / pontosNecessariosNesteNivel) * 100) || 0
    );

    return {
      progresso,
      proximoNivel: nivelAtual.proximo,
      pontosProximo: nivelAtual.threshold,
      faltam: Math.max(0, nivelAtual.threshold - pontos),
      isRei: false,
    };
  }

  // Função de inatividade (mantida como estava)
  function getInatividadeInfo(ultimaAtividade: string | null) {
    const diasPassados = 10; // ← placeholder, substitua depois pela lógica real

    let mensagem = '';
    let cor = 'text-white/70';

    if (diasPassados >= 60) {
      mensagem = "Oi sumido! Vamos começar de novo? Seu próximo churrasco tá te esperando 🔥";
      cor = 'text-[#E63946]/80';
    } else if (diasPassados >= 30) {
      mensagem = "Seus benefícios foram reduzidos em 50%. Sua boca sente saudade do nosso sabor! Volta pra gente 🍖";
      cor = 'text-[#F4A261]/80';
    } else if (30 - diasPassados <= 15) {
      const diasRestantes = 30 - diasPassados;
      mensagem = `Faltam ${diasRestantes} dias pra manter 100% dos seus benefícios. Que tal uma cupimzinha em breve? 👑`;
      cor = 'text-[#F4A261]';
    } else {
      mensagem = "Seu paladar merece nosso cupim e seu bolso as oportunidades! Volte logo pra continuar aproveitando 🔥";
      cor = 'text-white/70';
    }

    return { mensagem, cor };
  }

  // Badge de nível (mantido)
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
    return 'bg-[#E63946]/15 text-[#ffd7d7] border-[#E63946]/30'; // Bronze ou default
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
                if (value.length <= 11) setTelefone(value);
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

        {/* Cupom gerado */}
        {cupom && (
          <div id="cupom-box" className="mt-6 rounded-2xl border-2 border-[#F4A261] bg-[#F4A261]/20 p-6 text-center shadow-2xl animate-pulse">
            <p className="text-2xl font-bold text-[#F4A261] mb-2">Cupom gerado com sucesso!</p>
            <p className="text-4xl font-extrabold text-[#F4A261] tracking-wider mb-4">
              {cupom}
            </p>

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
              <span className={`rounded-full border px-3 py-1 text-xs ${nivelBadge()}`}>
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

            {/* Área de progresso + inatividade */}
<div className="mt-6 bg-black/30 p-4 rounded-xl border border-white/10">
  {(() => {
    const progressInfo = getProgressInfo(resultado.nivel, resultado.pontos);
    const inatividadeInfo = getInatividadeInfo(null);

    if (progressInfo.isRei) {
      // Apenas para Rei do Cupim: sem barra, só mensagem de conquista
      return (
        <div className="text-center space-y-4">
          <p className="text-lg font-bold text-[#FFD700] flex items-center justify-center gap-2">
            Você é o Rei do Cupim! 👑
          </p>
          <p className="text-sm text-white/80">
            Nível máximo alcançado. Parabéns pelos benefícios exclusivos!
          </p>
          <p className={`text-sm ${inatividadeInfo.cor}`}>
            {inatividadeInfo.mensagem}
          </p>
        </div>
      );
    }

    // Para Prata e Ouro: mostra a barra de progresso normalmente
    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm text-white/80 mb-2">
            Progresso para <strong className="text-[#F4A261]">{progressInfo.proximoNivel}</strong>:
          </p>
          <div className="relative h-5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-gradient-to-r from-[#E63946] to-[#F4A261] transition-all duration-700 ease-out"
              style={{ width: `${progressInfo.progresso}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-white/70">
            <span>{resultado.pontos.toLocaleString('pt-BR')} pts</span>
            <span>
              {progressInfo.faltam > 0
                ? `Faltam ${progressInfo.faltam.toLocaleString('pt-BR')} pts`
                : 'Próximo nível alcançado!'}
            </span>
          </div>
        </div>

        <p className={`text-sm text-center ${inatividadeInfo.cor}`}>
          {inatividadeInfo.mensagem}
        </p>
      </div>
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
              {/* Taxa de Entrega Grátis */}
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

              {/* Resgate com Cashback */}
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