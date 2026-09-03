'use client';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';

function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

function formatPhoneBR(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

function getNivelEmoji(nivel: string) {
  switch (nivel) {
    case 'BRONZE': return '🥉';
    case 'PRATA': return '🥈';
    case 'OURO': return '🥇';
    case 'REI': return '👑';
    default: return '🥉';
  }
}

export default function ResgatePage() {

  // Campos de entrada
  const [telefone, setTelefone] = useState('');
  const telefoneDigits = useMemo(() => onlyDigits(telefone), [telefone]);

  const [pin, setPin] = useState('');

  // Controle geral
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Dados logados
  const [dadosCliente, setDadosCliente] = useState<any>(null);
  const [cupom, setCupom] = useState<string | null>(null);

  // Loja
  const [produtos, setProdutos] = useState<any[]>([]);
  const [premio, setPremio] = useState<any>(null);
  const [ganhadores, setGanhadores] = useState<any[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState('todos');

  // Carregar produtos, sorteio e ganhadores
  useEffect(() => {
    async function load() {
      try {
        const g = await fetch('/api/sorteio/ganhadores').then(r => r.json());
        const payloadG = g?.data ?? g;
        setGanhadores(payloadG?.ganhadores || []);

        const p = await fetch('/api/produtos').then(r => r.json());
        const payloadP = p?.data ?? p;
        setProdutos(Array.isArray(payloadP) ? payloadP : payloadP?.produtos || []);

        const s = await fetch('/api/sorteio/atual').then(r => r.json());
        const payloadS = s?.data ?? s;
        setPremio(payloadS?.sorteio || null);
      } catch (err) {
        console.error('Erro ao carregar dados', err);
      }
    }
    load();
  }, []);

  // =======================================
  // 1 — PRIMEIRO PASSO: CHECAR STATUS
  // =======================================
  async function verificarCadastro() {
    setFeedback(null);

    if (telefoneDigits.length !== 11) {
      setFeedback({ type: 'error', text: 'Digite seu WhatsApp com DDD.' });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/resgate/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: telefoneDigits })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao verificar.');

      // status = novo → mandar para cadastro
      if (data.status === 'novo') {
        window.location.href = `/cadastro?telefone=${telefoneDigits}`;
        return;
      }

      // status = pre_cadastro → mandar para completar
      if (data.status === 'pre_cadastro') {
        setFeedback({
          type: 'error',
          text: 'Seu cadastro foi iniciado, mas ainda precisa de confirmação segura do telefone. Procure o atendimento do restaurante para concluir.',
        });
        return;
      }

      // status = completo → mostrar campo PIN
      if (data.status === 'completo') {
        setFeedback({
          type: 'success',
          text: 'Telefone encontrado. Digite sua senha (PIN).'
        });
      }

    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  // =======================================
  // 2 — LOGIN FINAL COM PIN
  // =======================================
  async function fazerLogin() {
    setFeedback(null);

    if (pin.length !== 4) {
      setFeedback({ type: 'error', text: 'PIN deve ter 4 dígitos.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/resgate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: telefoneDigits, pin })
      });

      const data = await res.json();
      const payload = data?.data ?? data;

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || payload?.error || 'Erro ao acessar sua conta.');
      }

      setDadosCliente(payload);
      setFeedback({ type: 'success', text: 'Bem-vindo!' });

    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  // =======================================
  // 3 — RESGATE
  // =======================================
  async function resgatar(tipo: any, valorDesconto?: any, produtoId?: number) {
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
      const payload = data?.data ?? data;

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || payload?.error || 'Erro ao processar resgate.');
      }

      setCupom(payload?.codigo || null);
      setDadosCliente(payload?.atualizado || null);

    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  // =======================================
  // INTERFACE
  // =======================================
  return (
    <div className="min-h-screen bg-[#280404] text-white pb-24">
      
      <header className="py-6 px-6 bg-[#1a0a0a] shadow-lg border-b border-[#c5a059]/30 flex justify-between items-center sticky top-0 z-50">
        <div className="w-12 h-12">
          <img src="/logo.png" className="w-full h-full object-contain"/>
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

        {/* ======================== LOGIN ======================== */}
        {!dadosCliente && (
          <div className="bg-[#4d0808] border border-[#c5a059]/30 p-8 rounded-2xl shadow-2xl">

            <h2 className="text-2xl font-black text-white mb-6 text-center">
              Acesse sua Conta
            </h2>

            {/* TELEFONE */}
            <div className="mb-5">
              <label className="text-xs font-bold text-[#c5a059] uppercase ml-1">WhatsApp</label>
              <input
                value={telefone}
                onChange={(e)=> setTelefone(formatPhoneBR(e.target.value))}
                className="w-full bg-[#280404] border border-[#c5a059]/30 p-3 rounded-xl text-white"
                placeholder="(85) 9XXXX-XXXX"
              />
            </div>

            {/* BOTÃO VERIFICAR */}
            <button
              onClick={verificarCadastro}
              disabled={loading}
              className="w-full bg-[#c5a059] text-black font-bold py-4 rounded-xl text-lg shadow active:translate-y-1"
            >
              {loading ? 'VERIFICANDO...' : 'CONTINUAR'}
            </button>

            {/* PIN aparece SOMENTE se status = completo */}
            {feedback?.text?.includes('Digite sua senha') && (
              <div className="mt-6">
                <label className="text-xs font-bold text-[#c5a059] uppercase ml-1">PIN</label>
                <input
                  value={pin}
                  onChange={(e)=> setPin(onlyDigits(e.target.value).slice(0,4))}
                  className="w-full bg-[#280404] border border-[#c5a059]/30 p-3 rounded-xl text-center text-white tracking-[0.5em]"
                  placeholder="****"
                  type="password"
                />

                <button
                  onClick={fazerLogin}
                  disabled={loading}
                  className="mt-4 w-full bg-[#e31e24] text-white font-black py-4 rounded-xl text-lg shadow active:translate-y-1"
                >
                  {loading ? 'ENTRANDO...' : 'ENTRAR'}
                </button>

                <Link href="/redefinir-pin" className="mt-3 inline-block text-xs underline text-zinc-400">
                  Esqueci o PIN
                </Link>
              </div>
            )}

          </div>
        )}

        {/* ======================== ÁREA LOGADA ======================== */}
        {dadosCliente && (
          <div className="space-y-8 mt-6">

            {/* BOAS-VINDAS */}
            <div className="bg-gradient-to-br from-[#4d0808] to-[#280404] rounded-2xl p-6 shadow-xl border border-[#c5a059]/20">

              <p className="text-zinc-400 text-xs font-bold uppercase">Bem-vindo,</p>
              <h2 className="text-2xl font-black">{dadosCliente.cliente.nome.split(' ')[0]}</h2>

              <div className="mt-3 flex gap-4">
                <div>
                  <p className="text-[#c5a059] text-xs uppercase">Pontos</p>
                  <p className="text-3xl font-black">{dadosCliente.pontos}</p>
                </div>

                <div>
                  <p className="text-[#e31e24] text-xs uppercase">Cashback</p>
                  <p className="text-3xl font-black">R$ {Number(dadosCliente.cashback).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* PRÊMIO DO SORTEIO */}
            {premio && (
              <div className="bg-[#4d0808] border border-[#c5a059]/30 p-5 rounded-2xl">
                <h2 className="text-xl font-black text-[#c5a059] mb-3">🎁 Prêmio do Sorteio</h2>
                <div className="w-full h-48 overflow-hidden rounded-xl border mb-3">
                  <img src={premio.imagem_url} className="w-full h-full object-cover"/>
                </div>
                <p className="font-bold">{premio.titulo}</p>
                <p className="text-xs text-[#c5a059] mt-2">📅 Sorteio: {premio.data_sorteio}</p>
              </div>
            )}

            {/* GANHADORES */}
            {ganhadores.length > 0 && (
              <div className="bg-[#4d0808] border border-[#c5a059]/30 p-5 rounded-2xl">
                <h2 className="text-xl font-black text-[#c5a059] mb-3">🏆 Últimos Ganhadores</h2>

                {ganhadores.map(g => (
                  <div key={g.id} className="border-b border-[#c5a059]/20 pb-3 mb-3">
                    <p className="font-bold">{g.nome || g.nome_cliente}</p>
                    <p className="text-sm text-zinc-400">{g.telefone || g.telefone_cliente}</p>
                    <p className="text-xs">{new Date(g.created_at || g.criado_em).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}

            {/* CUPOM */}
            {cupom && (
              <div className="bg-[#c5a059] text-[#280404] p-6 rounded-2xl text-center">
                <p className="text-xs font-black uppercase mb-2">Resgate Confirmado!</p>

                <p className="text-4xl font-black mb-4 border-2 border-[#280404] border-dashed rounded-lg bg-white/10 py-2 tracking-widest">
                  {cupom}
                </p>

                <div className="bg-white p-2 rounded-xl inline-block">
                  <QRCodeSVG value={`${window.location.origin}/validar?cupom=${cupom}`} size={120} />
                </div>

                <p className="text-xs font-bold mt-2">Mostre ao caixa para validar.</p>

                <button onClick={()=> setCupom(null)} className="mt-3 text-xs underline">Fechar</button>
              </div>
            )}

            {/* PRODUTOS */}
            {!cupom && (
              <div className="space-y-8">

                <div>
                  <h3 className="text-lg font-black mb-4">🍔 Trocar Pontos por Produtos</h3>

                  {/* filtros */}
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    {['todos','destaque','prato','bebida','sobremesa'].map(cat => (
                      <button
                        key={cat}
                        onClick={()=> setFiltroCategoria(cat)}
                        className={`px-4 py-1 rounded-full text-xs font-bold capitalize border ${
                          filtroCategoria === cat
                            ? 'bg-[#c5a059] text-black'
                            : 'text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {cat === 'destaque' ? '🔥 Ofertas' : cat}
                      </button>
                    ))}
                  </div>

                  {/* lista */}
                  <div className="grid gap-4">
                    {produtos
                      .filter(p => p.ativo !== false)
                      .filter(p => filtroCategoria === 'todos'
                        ? true
                        : filtroCategoria === 'destaque'
                        ? p.destaque
                        : p.categoria === filtroCategoria
                      )
                      .map(p => {
                        const original = p.custo_em_pontos;
                        const final = p.destaque ? Math.floor(original*0.5) : original;
                        const pode = dadosCliente.pontos >= final;

                        return (
                          <div key={p.id} className="bg-[#280404] border border-[#c5a059]/20 p-3 rounded-xl flex gap-3 relative">
                            
                            {p.destaque && (
                              <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] px-2 py-1">
                                50% OFF
                              </div>
                            )}

                            <div className="w-20 h-20 bg-black/40 rounded-lg overflow-hidden">
                              {p.imagem_url
                                ? <img src={p.imagem_url} className="w-full h-full object-cover"/>
                                : <span className="text-2xl">{p.categoria==='bebida'?'🥤':'🍖'}</span>
                              }
                            </div>

                            <div className="flex-1">
                              <h4 className="font-bold">{p.nome}</h4>
                              <p className="text-[10px] text-zinc-400">
                                {p.descricao || 'Delicioso e feito na hora.'}
                              </p>

                              <div className="mt-2 flex gap-2">
                                {p.destaque && <span className="text-xs line-through text-zinc-500">{original}</span>}
                                <span className="text-sm font-black text-[#c5a059]">{final} pts</span>
                              </div>
                            </div>

                            <button
                              onClick={()=> resgatar('produto', 0, p.id)}
                              disabled={!pode || loading}
                              className={`px-4 py-2 rounded-lg font-bold text-xs ${
                                pode
                                  ? 'bg-[#c5a059] text-black'
                                  : 'bg-zinc-800 text-zinc-500'
                              }`}
                            >
                              {loading ? '...' : 'RESGATAR'}
                            </button>
                          </div>
                        );
                      })
                    }
                  </div>

                </div>

                {/* ENTREGA GRÁTIS */}
                <div>
                  <h3 className="text-lg font-black mb-4">🛵 Entrega Grátis</h3>
                  <button
                    onClick={() => resgatar('frete')}
                    disabled={dadosCliente.pontos < 200 || loading}
                    className={`w-full p-4 rounded-xl border font-black ${
                      dadosCliente.pontos >= 200
                        ? 'bg-[#c5a059] text-black border-[#c5a059]'
                        : 'bg-zinc-900 text-zinc-600 border-zinc-800'
                    }`}
                  >
                    RESGATAR POR 200 PONTOS
                  </button>
                </div>

                {/* CASHBACK */}
                <div>
                  <h3 className="text-lg font-black mb-4">💰 Usar Cashback</h3>

                  <div className="grid grid-cols-3 gap-3">
                    {[5,10,15].map(valor => (
                      <button
                        key={valor}
                        onClick={()=> resgatar("cashback", valor)}
                        disabled={dadosCliente.cashback < valor}
                        className={`p-4 rounded-xl text-center border ${
                          dadosCliente.cashback >= valor
                            ? 'bg-[#e31e24] text-white'
                            : 'bg-zinc-900 text-zinc-700 border-zinc-800'
                        }`}
                      >
                        <p className="text-xs font-bold">Desconto</p>
                        <p className="text-2xl font-black">R$ {valor}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* SAIR */}
                <button
                  onClick={async ()=>{
                    await fetch('/api/resgate/logout', { method: 'POST' });
                    setDadosCliente(null);
                    setTelefone('');
                    setPin('');
                    setCupom(null);
                  }}
                  className="w-full py-4 text-xs text-zinc-500 hover:text-white"
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
