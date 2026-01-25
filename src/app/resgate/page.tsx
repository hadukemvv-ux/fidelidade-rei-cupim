'use client';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatPhoneBR(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// Emojis por nível
function getNivelEmoji(nivel: string) {
  switch (nivel) {
    case 'BRONZE': return '🥉';
    case 'PRATA': return '🥈';
    case 'OURO': return '🥇';
    case 'REI_DO_CUPIM': return '👑';
    default: return '🥉';
  }
}

export default function ResgatePage() {
  const [telefone, setTelefone] = useState('');
  const [pin, setPin] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dadosCliente, setDadosCliente] = useState<any>(null);
  const [cupom, setCupom] = useState<string | null>(null);
  const [showMorePontos, setShowMorePontos] = useState(false);
  const [showMoreCashback, setShowMoreCashback] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]); 
  
  // Estados para Redefinição de PIN
  const [showRedefinirPin, setShowRedefinirPin] = useState(false);
  const [dataNascimentoRedefinir, setDataNascimentoRedefinir] = useState('');
  const [novoPin, setNovoPin] = useState('');
  const [confirmNovoPin, setConfirmNovoPin] = useState('');

  const telefoneDigits = useMemo(() => onlyDigits(telefone), [telefone]);
  const telefoneOk = telefoneDigits.length === 11;
  const pinOk = pin.length === 4; 

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setDadosCliente(null);
    setCupom(null);

    if (!telefoneOk) {
      setFeedback({ type: 'error', text: 'Digite seu WhatsApp com DDD (11 dígitos).' });
      return;
    }

    if (!pinOk) { 
      setFeedback({ type: 'error', text: 'Digite seu PIN de 4 dígitos.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/resgate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: telefoneDigits, pin }), 
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Não foi possível consultar. Verifique seu PIN.');
      }

      setDadosCliente(data);
      setFeedback({ type: 'success', text: 'Dados encontrados!' });

      const produtosRes = await fetch('/api/produtos');
      if (produtosRes.ok) {
        const produtosData = await produtosRes.json();
        setProdutos(produtosData || []);
      }
    } catch (e: any) {
      setFeedback({ type: 'error', text: e?.message || 'Não foi possível consultar. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  }

  async function redefinirPin() {
    if (!dataNascimentoRedefinir || !novoPin || novoPin !== confirmNovoPin || novoPin.length !== 4) {
      setFeedback({ type: 'error', text: 'Preencha todos os campos corretamente.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/redefinir-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone: telefoneDigits,
          data_nascimento: dataNascimentoRedefinir,
          novo_pin: novoPin,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Não foi possível redefinir o PIN.');
      }

      setFeedback({ type: 'success', text: 'PIN redefinido com sucesso!' });
      setShowRedefinirPin(false);
      setDataNascimentoRedefinir('');
      setNovoPin('');
      setConfirmNovoPin('');
      setPin(''); 
    } catch (e: any) {
      setFeedback({ type: 'error', text: e?.message || 'Erro ao redefinir PIN.' });
    } finally {
      setLoading(false);
    }
  }

  async function resgatar(tipo: 'pontos' | 'cashback' | 'frete' | 'produto', valorDesconto: number, produtoId?: number) {
    if (!dadosCliente) {
      setFeedback({ type: 'error', text: 'Consulte o telefone primeiro.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/resgate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone: telefoneDigits,
          pin, 
          tipo,
          valorDesconto,
          produtoId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao resgatar.');
      }

      setCupom(data.codigo);
      setDadosCliente(data.atualizado);

      setTimeout(() => {
        const cupomElement = document.getElementById('cupom-box');
        if (cupomElement) {
          cupomElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          cupomElement.classList.add('animate-pulse');
          setTimeout(() => cupomElement.classList.remove('animate-pulse'), 3000);
        }
      }, 100);
    } catch (e: any) {
      setFeedback({ type: 'error', text: e?.message || 'Erro de conexão. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#280404] text-white font-sans">
      <header className="pt-10 pb-6 flex flex-col items-center justify-center">
        <div className="relative w-40 h-40 mb-4">
          <img src="/logo.png" alt="Logo Rei do Cupim" className="w-full h-full object-contain" />
        </div>

        <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-center">
          <span className="bg-gradient-to-r from-[#c5a059] via-white to-[#c5a059] bg-clip-text text-transparent">
            RESGATE
          </span>
        </h1>

        <div className="w-24 h-1 bg-[#e31e24] mt-4 shadow-[0_0_10px_#e31e24]"></div>
      </header>

      <main className="max-w-lg mx-auto px-6 pb-16">
        <div className="bg-[#4d0808] border border-black/20 rounded-xl p-8 shadow-xl">
          <p className="text-zinc-200/90 text-sm mb-8">
            Digite seu WhatsApp e PIN para consultar seus <span className="text-[#c5a059] font-bold">pontos, cashback e tickets</span>.
          </p>

          {feedback && (
            <div
              className={`mb-6 rounded-lg px-4 py-3 text-sm border ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-100'
                  : 'bg-red-500/10 border-red-400/30 text-red-100'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {!dadosCliente && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-2">
                  WhatsApp (com DDD)
                </label>
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhoneBR(e.target.value))}
                  inputMode="numeric"
                  placeholder="(85) 9XXXX-XXXX"
                  className="w-full bg-[#280404] border border-[#c5a059]/30 focus:border-[#c5a059] outline-none rounded-lg px-4 py-3 text-white placeholder:text-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-2">
                  PIN de 4 dígitos
                </label>
                <input
                  value={pin}
                  onChange={(e) => setPin(onlyDigits(e.target.value).slice(0, 4))}
                  inputMode="numeric"
                  placeholder="Ex: 1234"
                  className="w-full bg-[#280404] border border-[#c5a059]/30 focus:border-[#c5a059] outline-none rounded-lg px-4 py-3 text-white placeholder:text-zinc-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#e31e24] hover:bg-[#c1191f] disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-4 rounded-sm text-lg transition-all shadow-[6px_6px_0px_#c5a059] active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                {loading ? 'CONSULTANDO...' : 'CONSULTAR'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowRedefinirPin(true)}
                  className="text-[#c5a059] hover:text-white text-sm underline"
                >
                  Esqueci meu PIN
                </button>
              </div>
            </form>
          )}

          {showRedefinirPin && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[#4d0808] border border-[#c5a059] rounded-xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-lg font-bold text-[#c5a059] mb-4">Redefinir PIN</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-2">
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      value={dataNascimentoRedefinir}
                      onChange={(e) => setDataNascimentoRedefinir(e.target.value)}
                      className="w-full bg-[#280404] border border-[#c5a059]/30 focus:border-[#c5a059] outline-none rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-2">
                      Novo PIN (4 dígitos)
                    </label>
                    <input
                      value={novoPin}
                      onChange={(e) => setNovoPin(onlyDigits(e.target.value).slice(0, 4))}
                      inputMode="numeric"
                      placeholder="Ex: 5678"
                      className="w-full bg-[#280404] border border-[#c5a059]/30 focus:border-[#c5a059] outline-none rounded-lg px-4 py-3 text-white placeholder:text-zinc-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-2">
                      Confirmar Novo PIN
                    </label>
                    <input
                      value={confirmNovoPin}
                      onChange={(e) => setConfirmNovoPin(onlyDigits(e.target.value).slice(0, 4))}
                      inputMode="numeric"
                      placeholder="Digite novamente"
                      className="w-full bg-[#280404] border border-[#c5a059]/30 focus:border-[#c5a059] outline-none rounded-lg px-4 py-3 text-white placeholder:text-zinc-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowRedefinirPin(false)}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 rounded text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={redefinirPin}
                    disabled={loading}
                    className="flex-1 bg-[#e31e24] hover:bg-[#c1191f] disabled:opacity-60 text-white font-bold py-2 rounded text-sm transition-colors"
                  >
                    {loading ? 'SALVANDO...' : 'SALVAR NOVO PIN'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {cupom && (
            <div id="cupom-box" className="mt-6 rounded-2xl border-2 border-[#c5a059] bg-[#c5a059]/20 p-6 text-center shadow-2xl">
              <p className="text-2xl font-bold text-[#c5a059] mb-2">Cupom gerado com sucesso!</p>
              <p className="text-4xl font-extrabold text-[#c5a059] tracking-wider mb-4">
                {cupom}
              </p>

              <div className="my-6 flex justify-center">
                <QRCodeSVG
                  value={`https://fidelidade-cupim.vercel.app/validar?cupom=${cupom}&telefone=${telefoneDigits}`}
                  size={200}
                  bgColor="#280404"
                  fgColor="#c5a059"
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

          {dadosCliente && !cupom && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-[#c5a059] mb-2">
                  Olá, {dadosCliente.cliente.nome}!
                </h2>
                <p className="text-zinc-300 text-sm">
                  Seu nível atual: <span className="font-bold text-white">{getNivelEmoji(dadosCliente.nivel.atual)} {dadosCliente.nivel.atual.replace('_', ' ')}</span>
                </p>
              </div>

              {/* ✅ MENSAGEM CORRIGIDA PARA XP VITALÍCIO */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-300">
                     Próximo nível: <span className="font-bold text-white">{dadosCliente.nivel.proximo.replace('_', ' ')}</span>
                  </span>
                  <span className="text-[#c5a059] font-bold">
                    {dadosCliente.nivel.pontosParaProximo > 0
                      ? `Faltam ${dadosCliente.nivel.pontosParaProximo} pontos`
                      : 'Nível máximo atingido!'}
                  </span>
                </div>
                <div className="w-full bg-[#280404] rounded-full h-4 border border-[#c5a059]/30 relative overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#c5a059] to-[#e31e24] h-4 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${dadosCliente.nivel.progresso}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 text-right">
                  Progresso da sua jornada (XP Vitalício).
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#280404] border border-[#c5a059]/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-black text-[#c5a059] mb-1">
                    {dadosCliente.pontos}
                  </div>
                  <div className="text-xs text-zinc-400 uppercase tracking-widest">Pontos</div>
                </div>
                <div className="bg-[#280404] border border-[#c5a059]/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-black text-[#c5a059] mb-1">
                    R$ {Number(dadosCliente.cashback).toFixed(2)}
                  </div>
                  <div className="text-xs text-zinc-400 uppercase tracking-widest">Cashback</div>
                </div>
                <div className="bg-[#280404] border border-[#c5a059]/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-black text-[#c5a059] mb-1">
                    {dadosCliente.tickets}
                  </div>
                  <div className="text-xs text-zinc-400 uppercase tracking-widest">Tickets</div>
                </div>
              </div>

              {/* ✅ MENSAGEM MOTIVACIONAL AJUSTADA */}
              <div className="bg-[#280404]/50 border border-[#c5a059]/20 rounded-lg p-4">
                <p className="text-zinc-200 text-sm">
                  {dadosCliente.nivel.atual === 'REI_DO_CUPIM'
                    ? '🏆 Você é o Rei! Continue acumulando pontos para manter a coroa.'
                    : `💪 Acumule mais ${dadosCliente.nivel.pontosParaProximo} pontos na sua jornada para virar ${dadosCliente.nivel.proximo.replace('_', ' ')} e multiplicar seus ganhos! O nível é vitalício (enquanto você se mantiver ativo).`}
                </p>
                {dadosCliente.avisoInatividade && (
                  <p className="text-zinc-400 text-xs mt-2">
                    ⚠️ {dadosCliente.avisoInatividade}
                  </p>
                )}
              </div>

              {dadosCliente.nivel.atual === 'REI_DO_CUPIM' && (
                <div className="mt-6 bg-gradient-to-r from-[#c5a059] to-[#e31e24] border-2 border-[#c5a059] rounded-xl p-6 text-center shadow-2xl animate-pulse">
                  <h3 className="text-3xl font-black text-[#280404] mb-2">👑 VOCÊ É O VERDADEIRO REI DO CUPIM! 👑</h3>
                  <p className="text-[#280404] font-bold text-lg mb-4">
                    Com 14x pontos em cada pedido, você tem os melhores benefícios!
                  </p>
                  <p className="text-[#280404]/80 text-sm">
                    Continue comprando para manter seu trono e desfrutar de vantagens exclusivas.
                  </p>
                  <div className="mt-6 flex justify-center">
                    <span className="text-6xl animate-bounce">🏆</span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="bg-[#280404]/50 border border-[#c5a059]/20 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-[#c5a059] mb-2">Taxa de Entrega Grátis</h3>
                  <button
                    onClick={() => resgatar('frete', 0)}
                    disabled={loading || dadosCliente.pontos < 200}
                    className="w-full bg-[#e31e24] hover:bg-[#c1191f] disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-3 rounded-sm text-lg transition-all"
                  >
                    200 pontos → Taxa de entrega grátis
                  </button>
                </div>

                {produtos.length > 0 && (
                  <div className="bg-[#280404]/50 border border-[#c5a059]/20 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-[#c5a059] mb-2">Resgate de Produtos</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {produtos.map((produto) => {
                        let custo = produto.custo_em_pontos; // Preço base (Bronze)
                        let custoOriginal = produto.custo_em_pontos; // Para mostrar o "De: X Por: Y"
                        
                        // Lógica de Preço Dinâmico (simulada aqui para exibição, o backend que valida)
                        if (dadosCliente.nivel.atual === 'PRATA') custo = produto.custo_prata;
                        else if (dadosCliente.nivel.atual === 'OURO') custo = produto.custo_ouro;
                        else if (dadosCliente.nivel.atual === 'REI_DO_CUPIM') custo = produto.custo_rei;

                        return (
                          <button
                            key={produto.id}
                            onClick={() => resgatar('produto', 0, produto.id)}
                            disabled={loading || dadosCliente.pontos < custo}
                            className="bg-[#e31e24] hover:bg-[#c1191f] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2 rounded text-sm transition-all flex justify-between px-4 items-center"
                          >
                            <span>{produto.nome}</span>
                            <span className="text-xs font-normal">
                              {custo < custoOriginal ? (
                                <>
                                  <span className="line-through opacity-60 mr-2">{custoOriginal}</span>
                                  <span className="font-bold">{custo} pts</span>
                                </>
                              ) : (
                                `${custo} pts`
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="bg-[#280404]/50 border border-[#c5a059]/20 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-[#c5a059] mb-2">Resgate com Pontos</h3>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => resgatar('pontos', 5)}
                      disabled={loading || dadosCliente.pontos < 1000}
                      className="bg-[#e31e24] hover:bg-[#c1191f] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2 rounded text-sm transition-all"
                    >
                      R$ 5 de desconto (1.000 pontos)
                    </button>
                    <button
                      onClick={() => resgatar('pontos', 10)}
                      disabled={loading || dadosCliente.pontos < 2000}
                      className="bg-[#e31e24] hover:bg-[#c1191f] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2 rounded text-sm transition-all"
                    >
                      R$ 10 de desconto (2.000 pontos)
                    </button>
                    {showMorePontos && (
                      <>
                        <button
                          onClick={() => resgatar('pontos', 15)}
                          disabled={loading || dadosCliente.pontos < 3000}
                          className="bg-[#e31e24] hover:bg-[#c1191f] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2 rounded text-sm transition-all"
                        >
                          R$ 15 de desconto (3.000 pontos)
                        </button>
                        <button
                          onClick={() => resgatar('pontos', 25)}
                          disabled={loading || dadosCliente.pontos < 5000}
                          className="bg-[#e31e24] hover:bg-[#c1191f] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2 rounded text-sm transition-all"
                        >
                          R$ 25 de desconto (5.000 pontos)
                        </button>
                      </>
                    )}
                  </div>
                  {!showMorePontos && (
                    <button
                      onClick={() => setShowMorePontos(true)}
                      className="mt-2 w-full bg-transparent border border-[#c5a059] hover:bg-[#c5a059]/10 text-[#c5a059] font-bold py-2 rounded text-sm transition-all"
                    >
                      Ver mais ▼
                    </button>
                  )}
                </div>

                <div className="bg-[#280404]/50 border border-[#c5a059]/20 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-[#c5a059] mb-2">Resgate com Cashback</h3>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => resgatar('cashback', 5)}
                      disabled={loading || dadosCliente.cashback < 5}
                      className="bg-[#e31e24] hover:bg-[#c1191f] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2 rounded text-sm transition-all"
                    >
                      R$ 5 de cashback
                    </button>
                    <button
                      onClick={() => resgatar('cashback', 10)}
                      disabled={loading || dadosCliente.cashback < 10}
                      className="bg-[#e31e24] hover:bg-[#c1191f] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2 rounded text-sm transition-all"
                    >
                      R$ 10 de cashback
                    </button>
                    {showMoreCashback && (
                      <button
                        onClick={() => resgatar('cashback', 15)}
                        disabled={loading || dadosCliente.cashback < 15}
                        className="bg-[#e31e24] hover:bg-[#c1191f] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2 rounded text-sm transition-all"
                      >
                        R$ 15 de cashback
                      </button>
                    )}
                  </div>
                  {!showMoreCashback && (
                    <button
                      onClick={() => setShowMoreCashback(true)}
                      className="mt-2 w-full bg-transparent border border-[#c5a059] hover:bg-[#c5a059]/10 text-[#c5a059] font-bold py-2 rounded text-sm transition-all"
                    >
                      Ver mais ▼
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  setDadosCliente(null);
                  setFeedback(null);
                  setTelefone('');
                  setPin(''); 
                  setCupom(null);
                }}
                className="w-full bg-transparent border border-[#c5a059] hover:bg-[#c5a059]/10 text-[#c5a059] font-bold py-3 rounded-sm text-lg transition-all"
              >
                Consultar outro telefone
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 text-sm">
            <Link href="/" className="text-[#c5a059] hover:text-white transition-colors">
              ← Voltar para Home
            </Link>
            <Link href="/cadastro" className="text-zinc-300 hover:text-white transition-colors">
              Ainda não sou cliente →
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-10 px-6 border-t border-[#4d0808]/50 text-center bg-[#1a0a0a]">
        <p className="text-[#c5a059] italic font-medium">Sua Majestade em Qualidade e Sabor!</p>
      </footer>
    </div>
  );
}