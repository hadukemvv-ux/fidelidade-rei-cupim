'use client';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';

// --- UTILITÁRIOS ---
function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatPhoneBR(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getNivelEmoji(nivel: string) {
  switch (nivel) {
    case 'BRONZE': return '🥉';
    case 'PRATA': return '🥈';
    case 'OURO': return '🥇';
    case 'REI_DO_CUPIM': return '👑';
    default: return '🥉';
  }
}

// --- COMPONENTE PRINCIPAL ---
export default function ResgatePage() {

  // LOGIN
  const [telefone, setTelefone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // PRÉ‑CADASTRO → NOVOS CAMPOS
  const [showCompletarCadastro, setShowCompletarCadastro] = useState(false);
  const [nomeCompletar, setNomeCompletar] = useState('');
  const [emailCompletar, setEmailCompletar] = useState('');
  const [dataCompletar, setDataCompletar] = useState('');
  const [pinCompletar, setPinCompletar] = useState('');
  const [pinCompletar2, setPinCompletar2] = useState('');
  const [loadingCompletar, setLoadingCompletar] = useState(false);

  // DADOS
  const [dadosCliente, setDadosCliente] = useState<any>(null);
  const [cupom, setCupom] = useState<string | null>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [premio, setPremio] = useState<any>(null);
  const [ganhadores, setGanhadores] = useState<any[]>([]);

  // FILTRO PRODUTOS
  const [filtroCategoria, setFiltroCategoria] = useState('todos');

  // REDEFINIR PIN
  const [showRedefinirPin, setShowRedefinirPin] = useState(false);
  const [dataNascimentoRedefinir, setDataNascimentoRedefinir] = useState('');
  const [novoPin, setNovoPin] = useState('');
  const [confirmNovoPin, setConfirmNovoPin] = useState('');

  // TRATAMENTO INPUT
  const telefoneDigits = useMemo(() => onlyDigits(telefone), [telefone]);
  const telefoneOk = telefoneDigits.length === 11;
  const pinOk = pin.length === 4;

  // CARREGAR GANHADORES
  useEffect(() => {
    async function carregarGanhadores() {
      try {
        const res = await fetch('/api/admin/sorteio/ganhadores');
        const data = await res.json();
        setGanhadores(data.ganhadores || []);
      } catch (e) {
        console.error("Erro ao carregar ganhadores:", e);
      }
    }
    carregarGanhadores();
  }, []);

  // CARREGAR PRODUTOS E SORTEIO
  useEffect(() => {
    async function carregarProdutos() {
      try {
        const res = await fetch('/api/produtos');
        const data = await res.json();
        setProdutos(data.produtos || []);
      } catch (e) {
        console.error("Erro ao carregar produtos:", e);
      }
    }

    async function carregarPremio() {
      try {
        const res = await fetch('/api/sorteio/atual');
        const data = await res.json();
        setPremio(data.sorteio || null);
      } catch (e) {
        console.error("Erro ao carregar prêmio:", e);
      }
    }

    carregarProdutos();
    carregarPremio();
  }, []);
// --- DETECTAR SE VEIO DA ROLETA E PRECISA COMPLETAR CADASTRO ---
useEffect(() => {
  async function verificarPreCadastro() {

    // Verifica se veio da roleta (via query ?from=roleta ou similar)
    const origem = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('from')
      : null;

    if (origem !== 'roleta') return;
    if (!telefoneDigits || telefoneDigits.length !== 11) return;

    try {
      const res = await fetch('/api/resgate/completar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: telefoneDigits })
      });

      const data = await res.json();

      // Se a API indicar que está pendente → abre o modal
      if (data?.status === 'pendente' || data?.pre_cadastro) {
        setShowCompletarCadastro(true);
      }

    } catch (err) {
      console.error("Erro ao verificar pré-cadastro:", err);
    }
  }

  verificarPreCadastro();
}, [telefoneDigits]);
  // --- LOGIN ATUALIZADO ---
  async function handleSubmit(e: any) {
    e.preventDefault();
    setFeedback(null);
    setCupom(null);
    setDadosCliente(null);

    if (!telefoneOk) {
      return setFeedback({ type: 'error', text: 'Digite seu WhatsApp com DDD.' });
    }
    if (!pinOk) {
      return setFeedback({ type: 'error', text: 'PIN deve ter 4 dígitos.' });
    }

    setLoading(true);
    try {
      const res = await fetch('/api/resgate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: telefoneDigits, pin }),
      });

      const data = await res.json();

      // 🔥 NOVO — DETECTAR PRÉ‑CADASTRO
      if (data?.pre_cadastro) {
        setFeedback({
          type: 'error',
          text: data.motivo || 'Seu cadastro foi iniciado pela Roleta. Finalize antes de continuar.'
        });

        // ABRIR MODAL AUTOMATICAMENTE
        setTimeout(() => {
          setShowCompletarCadastro(true);
        }, 300);

        setLoading(false);
        return;
      }

      if (!res.ok || !data?.ok) throw new Error(data.error);

      setDadosCliente(data);
      setFeedback({ type: 'success', text: 'Bem-vindo de volta!' });

    } catch (e: any) {
      setFeedback({ type: 'error', text: e.message || 'Erro ao logar.' });
    } finally {
      setLoading(false);
    }
  }
{/* ---------------- MODAL COMPLETAR CADASTRO ---------------- */}
{showCompletarCadastro && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-[#280404] border-2 border-[#c5a059] rounded-2xl p-6 w-full max-w-sm">

      <h3 className="text-lg font-bold text-[#c5a059] mb-4 text-center">
        Finalizar Cadastro
      </h3>

      <p className="text-xs text-zinc-300 text-center mb-4">
        Complete seus dados para acessar sua conta.
      </p>

      <div className="space-y-4">

        {/* NOME */}
        <input
          value={nomeCompletar}
          onChange={(e) => setNomeCompletar(e.target.value)}
          placeholder="Seu nome completo"
          className="w-full bg-black/20 border border-[#c5a059]/30 p-3 rounded-lg text-white"
        />

        {/* EMAIL */}
        <input
          value={emailCompletar}
          onChange={(e) => setEmailCompletar(e.target.value)}
          placeholder="email@exemplo.com"
          type="email"
          className="w-full bg-black/20 border border-[#c5a059]/30 p-3 rounded-lg text-white"
        />

        {/* DATA DE NASCIMENTO */}
        <input
          type="date"
          value={dataCompletar}
          onChange={(e) => setDataCompletar(e.target.value)}
          className="w-full bg-black/20 border border-[#c5a059]/30 p-3 rounded-lg text-white"
        />

        {/* PIN */}
        <input
          value={pinCompletar}
          onChange={(e) => setPinCompletar(onlyDigits(e.target.value).slice(0, 4))}
          placeholder="Crie um PIN"
          inputMode="numeric"
          className="w-full bg-black/20 border border-[#c5a059]/30 p-3 rounded-lg text-white text-center tracking-widest"
        />

        {/* CONFIRMAR PIN */}
        <input
          value={pinCompletar2}
          onChange={(e) => setPinCompletar2(onlyDigits(e.target.value).slice(0, 4))}
          placeholder="Confirmar PIN"
          inputMode="numeric"
          className="w-full bg-black/20 border border-[#c5a059]/30 p-3 rounded-lg text-white text-center tracking-widest"
        />
      </div>

      {/* BOTÕES */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => setShowCompletarCadastro(false)}
          className="flex-1 py-3 text-zinc-400 font-bold hover:bg-white/10 rounded-lg"
        >
          Cancelar
        </button>

        <button
          onClick={async () => {
            if (!nomeCompletar.trim()) {
              setFeedback({ type: 'error', text: 'Digite seu nome.' });
              return;
            }
            if (!emailCompletar.includes('@')) {
              setFeedback({ type: 'error', text: 'Digite um email válido.' });
              return;
            }
            if (!dataCompletar) {
              setFeedback({ type: 'error', text: 'Selecione sua data de nascimento.' });
              return;
            }
            if (pinCompletar.length !== 4 || pinCompletar2.length !== 4) {
              setFeedback({ type: 'error', text: 'PIN deve ter 4 dígitos.' });
              return;
            }
            if (pinCompletar !== pinCompletar2) {
              setFeedback({ type: 'error', text: 'Os PINs não coincidem.' });
              return;
            }

            setLoadingCompletar(true);

            try {
              // COMPLETAR CADASTRO
              const res = await fetch('/api/resgate/completar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  telefone: telefoneDigits,
                  nome: nomeCompletar.trim(),
                  email: emailCompletar.trim().toLowerCase(),
                  data_nascimento: dataCompletar,
                  pin: pinCompletar
                })
              });

              const data = await res.json();

              if (!res.ok || !data.ok) {
                throw new Error(data.error || 'Erro ao completar cadastro.');
              }

              // LOGIN AUTOMÁTICO APÓS FINALIZAR
              const resLogin = await fetch('/api/resgate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  telefone: telefoneDigits,
                  pin: pinCompletar
                })
              });

              const loginData = await resLogin.json();

              if (!resLogin.ok || !loginData.ok) {
                throw new Error(loginData.error || 'Erro ao entrar automaticamente.');
              }

              // SUCESSO!
              setDadosCliente(loginData);
              setFeedback({ type: 'success', text: 'Cadastro finalizado! Bem-vindo!' });

              // FECHAR MODAL AO FINAL DA AUTENTICAÇÃO
              setShowCompletarCadastro(false);

            } catch (err: any) {
              setFeedback({ type: 'error', text: err.message });
            } finally {
              setLoadingCompletar(false);
            }

          }}
          className="flex-1 bg-[#e31e24] text-white font-bold py-3 rounded-lg"
        >
          {loadingCompletar ? 'SALVANDO...' : 'Salvar e Entrar'}
        </button>
      </div>

    </div>
  </div>
)}
    // --- REDEFINIR PIN ---
    async function redefinirPin() {
      if (!dataNascimentoRedefinir || !novoPin || novoPin !== confirmNovoPin || novoPin.length !== 4) {
        return setFeedback({ type: 'error', text: 'Preencha os dados corretamente.' });
      }

      setLoading(true);
      try {
        const res = await fetch('/api/redefinir-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telefone: telefoneDigits,
            data_nascimento: dataNascimentoRedefinir,
            novo_pin: novoPin
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setFeedback({ type: 'success', text: 'PIN alterado!' });
        setShowRedefinirPin(false);
        setNovoPin('');
        setConfirmNovoPin('');
        setDataNascimentoRedefinir('');

      } catch (e: any) {
        setFeedback({ type: 'error', text: e.message });
      } finally {
        setLoading(false);
      }
    }

    // --- RESGATAR ---
    async function resgatar(tipo: any, valorDesconto: any, produtoId?: number) {
      if (!dadosCliente) return;
      if (!confirm("Confirmar resgate?")) return;

      setLoading(true);
      setFeedback(null);

      try {
        const res = await fetch('/api/resgate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telefone: telefoneDigits,
            pin,
            tipo,
            valorDesconto,
            produtoId
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setCupom(data.codigo);
        setDadosCliente(data.atualizado);

        setTimeout(() => {
          const el = document.getElementById("cupom-box");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 100);

      } catch (e: any) {
        setFeedback({ type: 'error', text: e.message });
      } finally {
        setLoading(false);
      }
    }

    // --- INTERFACE ---
    return (
      <div className="min-h-screen bg-[#280404] text-white pb-24">

        {/* ---------------- HEADER ---------------- */}
        <header className="py-6 px-6 bg-[#1a0a0a] shadow-lg border-b border-[#c5a059]/30 flex justify-between items-center sticky top-0 z-50">
          <div className="w-12 h-12">
            <img src="/logo.png" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-lg font-black text-[#c5a059] tracking-widest">LOJA DE PONTOS</h1>
          <Link href="/" className="text-xs text-zinc-400 hover:text-white">Sair</Link>
        </header>

        <main className="max-w-xl mx-auto px-4 pt-4">

          {/* FEEDBACK */}
          {feedback && (
            <div className={`mb-6 px-4 py-3 rounded-lg text-sm border shadow-md ${
              feedback.type === 'success'
                ? 'bg-emerald-900/60 border-emerald-500 text-emerald-100'
                : 'bg-red-900/60 border-red-500 text-red-100'
            }`}>
              {feedback.text}
            </div>
          )}

          {/* ---------------- LOGIN ---------------- */}
          {!dadosCliente && (
            <div className="bg-[#4d0808] border border-[#c5a059]/30 p-8 rounded-2xl shadow-2xl">

              <h2 className="text-2xl font-black text-white mb-6 text-center">
                Acesse sua Conta
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* TELEFONE */}
                <div>
                  <label className="text-xs font-bold text-[#c5a059] uppercase ml-1">
                    WhatsApp
                  </label>
                  <input
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhoneBR(e.target.value))}
                    inputMode="numeric"
                    placeholder="(85) 9XXXX-XXXX"
                    className="w-full bg-[#280404] border border-[#c5a059]/30 rounded-xl px-4 py-3 text-white focus:border-[#c5a059]"
                  />
                </div>

                {/* PIN */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-bold text-[#c5a059] uppercase ml-1">PIN</label>
                    <button type="button" onClick={() => setShowRedefinirPin(true)} className="text-[10px] text-zinc-400 underline hover:text-[#c5a059]">
                      Esqueci
                    </button>
                  </div>
                  <input
                    value={pin}
                    onChange={(e) => setPin(onlyDigits(e.target.value).slice(0, 4))}
                    inputMode="numeric"
                    type="password"
                    placeholder="****"
                    className="w-full bg-[#280404] border border-[#c5a059]/30 rounded-xl px-4 py-3 text-center text-white tracking-[0.5em] focus:border-[#c5a059]"
                  />
                </div>

                {/* BOTÃO LOGAR */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#e31e24] hover:bg-[#c1191f] disabled:opacity-50 text-white font-black py-4 rounded-xl text-lg shadow-[0_4px_0_#8a0f12] active:translate-y-1"
                >
                  {loading ? 'ACESSANDO...' : 'ENTRAR'}
                </button>

              </form>

              <div className="mt-6 text-center">
                <Link href="/cadastro" className="text-sm text-[#c5a059] border-b border-[#c5a059] pb-1">
                  Criar conta grátis
                </Link>
              </div>

            </div>
          )}

          {/* ---------------- MODAL REDEFINIR PIN ---------------- */}
          {showRedefinirPin && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-[#280404] border-2 border-[#c5a059] rounded-2xl p-6 w-full max-w-sm">

                <h3 className="text-lg font-bold text-[#c5a059] mb-4 text-center">Nova Senha</h3>

                <div className="space-y-4">
                  <input type="date" value={dataNascimentoRedefinir} onChange={(e) => setDataNascimentoRedefinir(e.target.value)} className="w-full bg-black/20 border border-[#c5a059]/30 p-3 rounded-lg text-white" />
                  <input value={novoPin} onChange={(e) => setNovoPin(onlyDigits(e.target.value).slice(0, 4))} inputMode="numeric" placeholder="Novo PIN" className="w-full bg-black/20 border border-[#c5a059]/30 p-3 rounded-lg text-white text-center tracking-widest" />
                  <input value={confirmNovoPin} onChange={(e) => setConfirmNovoPin(onlyDigits(e.target.value).slice(0, 4))} inputMode="numeric" placeholder="Confirmar PIN" className="w-full bg-black/20 border border-[#c5a059]/30 p-3 rounded-lg text-white text-center tracking-widest" />
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowRedefinirPin(false)} className="flex-1 py-3 text-zinc-400 font-bold hover:bg-white/10 rounded-lg">Cancelar</button>
                  <button onClick={redefinirPin} className="flex-1 bg-[#e31e24] text-white font-bold py-3 rounded-lg">Salvar</button>
                </div>

              </div>
            </div>
          )}

          {/* ---------------- ÁREA LOGADA ---------------- */}
          {dadosCliente && (
            <div className="space-y-8 animate-fade-in-up">

              {/* ---------------- BOAS-VINDAS (PRIMEIRO BLOCO) ---------------- */}
              <div className="bg-gradient-to-br from-[#4d0808] to-[#280404] rounded-2xl p-6 shadow-xl border border-[#c5a059]/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#c5a059]/10 rounded-full blur-3xl -mr-10 -mt-10"></div>

                <div className="flex justify-between items-start relative z-10 mb-6">
                  <div>
                    <p className="text-zinc-400 text-xs font-bold uppercase">Bem-vindo,</p>
                    <h2 className="text-2xl font-black">{dadosCliente.cliente.nome.split(' ')[0]}</h2>
                  </div>
                  <div className="bg-black/40 px-3 py-1 rounded-full border border-[#c5a059]/30 text-xs font-bold text-[#c5a059]">
                    {getNivelEmoji(dadosCliente.nivel.atual)} {dadosCliente.nivel.atual.replace('REI_DO_CUPIM', 'REI')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <p className="text-[#c5a059] text-xs font-bold uppercase mb-1">Meus Pontos</p>
                    <p className="text-3xl font-black">{dadosCliente.pontos}</p>
                  </div>

                  <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <p className="text-[#e31e24] text-xs font-bold uppercase mb-1">Cashback</p>
                    <p className="text-3xl font-black">R$ {Number(dadosCliente.cashback).toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-4 bg-[#c5a059]/10 p-3 rounded-lg border border-[#c5a059]/20 flex justify-between relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎟️</span>
                    <span className="font-bold text-[#c5a059] text-sm">
                      {dadosCliente.tickets} Tickets da Sorte
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400">Acumule mais no caixa</span>
                </div>
              </div>

              {/* ---------------- PRÊMIO DO SORTEIO ---------------- */}
              {premio && (
                <div className="bg-[#4d0808] border border-[#c5a059]/30 p-5 rounded-2xl shadow-xl">
                  <h2 className="text-xl font-black text-[#c5a059] flex items-center gap-2 mb-3">
                    🎁 Prêmio do Sorteio
                  </h2>

                  <div className="w-full h-48 rounded-xl overflow-hidden border border-[#c5a059]/30 mb-4">
                    <img src={premio.imagem_url} className="w-full h-full object-cover" />
                  </div>

                  <p className="text-lg font-bold">{premio.titulo}</p>
                  <p className="text-sm text-zinc-300 mt-1">{premio.descricao}</p>
                  <p className="text-xs text-[#c5a059] mt-3">📅 Sorteio: {premio.data_sorteio}</p>
                </div>
              )}

              {/* ---------------- GANHADORES DO SORTEIO ---------------- */}
              {ganhadores.length > 0 && (
                <div className="bg-[#4d0808] border border-[#c5a059]/30 p-5 rounded-2xl shadow-xl">
                  <h2 className="text-xl font-black text-[#c5a059] mb-3 flex items-center gap-2">
                    🏆 Últimos Ganhadores
                  </h2>

                  {ganhadores.map((g) => (
                    <div key={g.id} className="border-b border-[#c5a059]/20 pb-3 mb-3 last:border-none last:pb-0 last:mb-0">
                      <p className="font-bold text-white text-lg">{g.nome_cliente}</p>
                      <p className="text-sm text-zinc-300">{g.telefone_cliente}</p>
                      <p className="text-sm text-zinc-400 mt-1">
                        Tickets: <span className="font-bold text-[#c5a059]">{g.tickets_no_sorteio}</span>
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {new Date(g.criado_em).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* ---------------- CUPOM ---------------- */}
              {cupom && (
                <div id="cupom-box" className="bg-[#c5a059] text-[#280404] p-6 rounded-2xl shadow-xl text-center">
                  <p className="text-xs font-black uppercase mb-2">Resgate Confirmado!</p>

                  <p className="text-4xl font-black mb-4 border-2 border-[#280404] border-dashed rounded-lg bg-white/10 py-2 tracking-wider">
                    {cupom}
                  </p>

                  <div className="bg-white p-2 rounded-xl inline-block">
                    <QRCodeSVG value={`https://fidelidade-cupim.vercel.app/validar?cupom=${cupom}`} size={120} />
                  </div>

                  <p className="text-xs font-bold mt-2">Mostre ao caixa para validar.</p>

                  <button onClick={() => setCupom(null)} className="mt-3 text-xs underline text-black/70 hover:text-black">
                    Fechar
                  </button>
                </div>
              )}

              {/* ---------------- PRODUTOS ---------------- */}
              {!cupom && (
                <div className="space-y-8">

                  {/* CATEGORIAS */}
                  <div>
                    <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                      <span className="text-[#c5a059] text-lg">🍔</span> Trocar Pontos por Produtos
                    </h3>

                    <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-2">
                      {['todos', 'destaque', 'prato', 'bebida', 'sobremesa'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setFiltroCategoria(cat)}
                          className={`px-4 py-1 rounded-full text-xs font-bold capitalize whitespace-nowrap border ${
                            filtroCategoria === cat
                              ? 'bg-[#c5a059] text-black border-[#c5a059]'
                              : 'bg-transparent text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {cat === 'destaque' ? '🔥 Ofertas' : cat}
                        </button>
                      ))}
                    </div>

                    {/* LISTA DE PRODUTOS */}
                    <div className="grid gap-4">

                      <div className="bg-[#280404] border border-[#c5a059]/30 p-4 rounded-xl flex gap-4 items-center">
                        <div className="w-16 h-16 bg-[#1a0a0a] rounded-lg flex items-center justify-center text-2xl">🛵</div>
                        <div className="flex-1">
                          <h4 className="font-bold text-white">Entrega Grátis</h4>
                          <p className="text-xs text-zinc-400">Não pague a taxa.</p>
                        </div>

                        <button
                          onClick={() => resgatar("frete", 0)}
                          disabled={dadosCliente.pontos < 200}
                          className={`px-4 py-2 rounded-lg font-bold ${
                            dadosCliente.pontos >= 200
                              ? 'bg-[#c5a059] text-black'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          200 pts
                        </button>
                      </div>

                      {produtos
                        .filter((p) => p.ativo !== false)
                        .filter((p) =>
                          filtroCategoria === 'todos'
                            ? true
                            : filtroCategoria === 'destaque'
                            ? p.destaque
                            : p.categoria === filtroCategoria
                        )
                        .map((produto) => {
                          const custoOriginal = produto.custo_em_pontos;
                          const custoFinal = produto.destaque ? Math.floor(custoOriginal * 0.5) : custoOriginal;
                          const pode = dadosCliente.pontos >= custoFinal;

                          return (
                            <div key={produto.id} className="bg-[#280404] border border-[#c5a059]/20 p-3 rounded-xl flex gap-3 relative">
                              
                              {produto.destaque && (
                                <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] px-2 py-1 rounded-bl-lg">
                                  50% OFF
                                </div>
                              )}

                              <div className="w-20 h-20 bg-black/40 rounded-lg flex items-center justify-center overflow-hidden">
                                {produto.imagem_url ? (
                                  <img src={produto.imagem_url} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-2xl">{produto.categoria === 'bebida' ? '🥤' : '🍖'}</span>
                                )}
                              </div>

                              <div className="flex-1">
                                <h4 className="font-bold text-white text-sm">{produto.nome}</h4>
                                <p className="text-[10px] text-zinc-400">
                                  {produto.descricao || 'Delicioso e feito na hora.'}
                                </p>

                                <div className="mt-2 flex items-center gap-2">
                                  {produto.destaque && (
                                    <span className="text-xs text-zinc-500 line-through">{custoOriginal}</span>
                                  )}
                                  <span className={`text-sm font-black ${produto.destaque ? 'text-[#e31e24]' : 'text-[#c5a059]'}`}>
                                    {custoFinal} pts
                                  </span>
                                </div>
                              </div>

                              <button
  onClick={() => {
    if (loading) return; // impede clique duplo
    resgatar('produto', 0, produto.id);
  }}
  disabled={!pode || loading}
  className={`px-4 py-2 rounded-lg font-bold text-xs ${
    pode && !loading ? 'bg-[#c5a059] text-black' : 'bg-zinc-800 text-zinc-500'
  }`}
>
  {loading ? 'PROCESSANDO...' : 'RESGATAR'}
</button>

                            </div>
                          );
                        })}

                      {produtos.length === 0 && (
                        <div className="text-center text-zinc-500 text-sm py-8">
                          Nenhum produto disponível no momento.
                        </div>
                      )}

                    </div>
                  </div>

                  {/* ---------------- CASHBACK ---------------- */}
                  <div>
                    <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                      <span className="text-[#e31e24] text-lg">💰</span> Usar Cashback
                    </h3>

                    <div className="grid grid-cols-3 gap-3">
                      {[5, 10, 15].map((valor) => (
                        <button
                          key={valor}
                          disabled={dadosCliente.cashback < valor}
                          onClick={() => resgatar("cashback", valor)}
                          className={`p-4 rounded-xl text-center border ${
                            dadosCliente.cashback >= valor
                              ? 'bg-[#e31e24] text-white border-red-400 hover:scale-105'
                              : 'bg-zinc-900 text-zinc-700 border-zinc-800 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <p className="text-xs font-bold">Desconto</p>
                          <p className="text-2xl font-black">R$ {valor}</p>
                        </button>
                      ))}
                    </div>

                    <p className="text-[10px] text-zinc-500 mt-2 text-center">
                      Use seu saldo acumulado para abater na conta.
                    </p>
                  </div>

                  {/* ---------------- SAIR ---------------- */}
                  <button
                    onClick={() => {
                      setDadosCliente(null);
                      setTelefone('');
                      setPin('');
                      setCupom(null);
                    }}
                    className="w-full py-4 text-xs text-zinc-500 font-bold hover:text-white"
                  >
                    SAIR DA MINHA CONTA
                  </button>

                </div>
              )}
            </div>
          )}

        </main>
      </div>
    );
  }