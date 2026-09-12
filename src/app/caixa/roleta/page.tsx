'use client';

import { QRCodeSVG } from 'qrcode.react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useState } from 'react';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function CaixaRoletaPage() {
  const [nivel, setNivel] = useState('1'); const [valor, setValor] = useState(''); const [mesa, setMesa] = useState('');
  const [url, setUrl] = useState(''); const [expires, setExpires] = useState(''); const [feedback, setFeedback] = useState(''); const [loading, setLoading] = useState(false);

  async function criarQr() {
    setLoading(true); setFeedback(''); setUrl('');
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch('/api/roleta-v2/sessoes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify({ nivel: Number(nivel), valor_comanda: Number(valor.replace(',', '.')), mesa_referencia: mesa }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Não foi possível gerar o QR.');
      setUrl(`${window.location.origin}/roleta/v2?token=${encodeURIComponent(result.token)}`); setExpires(result.expira_em);
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Não foi possível gerar o QR.'); }
    finally { setLoading(false); }
  }

  return <main className="min-h-screen bg-stone-950 px-4 py-8 text-white"><section className="mx-auto grid max-w-xl gap-5 rounded-2xl border border-amber-500/40 bg-stone-900 p-6 shadow-2xl"><header><Link href="/caixa" className="text-sm font-bold text-amber-400 underline">← Validador de cupom</Link><p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-amber-400">Operação · Roleta V2</p><h1 className="mt-2 text-3xl font-black">Gerar QR da mesa</h1><p className="mt-2 text-sm text-stone-300">O QR expira e só pode gerar um giro. Não entregue o celular antes de conferir o valor e o nível.</p></header>
    <div className="grid gap-3"><label className="grid gap-1 text-sm font-bold">Nível da compra<select value={nivel} onChange={(e) => setNivel(e.target.value)} className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-3"><option value="1">1 · Brasa</option><option value="2">2 · Chama</option><option value="3">3 · Nobre</option><option value="4">4 · Rei</option><option value="5">5 · Lenda</option></select></label><label className="grid gap-1 text-sm font-bold">Valor da comanda<input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex.: 250,00" className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-3" /></label><label className="grid gap-1 text-sm font-bold">Mesa ou referência<input value={mesa} onChange={(e) => setMesa(e.target.value)} placeholder="Ex.: Mesa 12" className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-3" /></label></div>
    <button onClick={criarQr} disabled={loading || !valor || !mesa} className="rounded-xl bg-amber-500 py-4 font-black text-stone-950 disabled:opacity-50">{loading ? 'Gerando…' : 'Gerar QR temporário'}</button>{feedback && <p className="rounded-lg border border-red-500 bg-red-950/40 p-3 text-sm text-red-100">{feedback}</p>}
    {url && <section className="grid justify-items-center gap-4 rounded-xl border border-emerald-500 bg-emerald-950/30 p-5 text-center"><QRCodeSVG value={url} size={220} includeMargin /><strong>QR pronto para o cliente</strong><p className="text-sm text-stone-300">Expira às {new Date(expires).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Depois de girar, este QR não poderá ser reutilizado.</p></section>}
  </section></main>;
}
