'use client';

import { Scanner } from '@yudiel/react-qr-scanner';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

type Coupon = { codigo_final: string; tipo_premio: string; canal_uso: string; status: string; modo_teste: boolean; expira_em: string; valor_desconto_percentual?: number | null; teto_desconto?: number | null; pedido_minimo?: number | null };
const labels: Record<string, string> = { frete_gratis: 'Taxa de entrega grátis', sobremesa: 'Sobremesa', saideira: '1 cerveja — Saideira', expulsadeira: '2 cervejas — Expulsadeira', desconto_presencial_10: '10% na compra presencial', desconto_delivery_10: '10% no delivery' };

function normalizeCode(value: string) {
  try { const url = new URL(value); return url.searchParams.get('cupom') || url.searchParams.get('codigo') || value; }
  catch { return value; }
}

export default function CaixaPage() {
  const router = useRouter();
  const [code, setCode] = useState(''); const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [loading, setLoading] = useState(false); const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (!data.session) router.replace('/login'); }); }, [router]);

  async function consult(raw = code) {
    const codigo = normalizeCode(raw).trim().toUpperCase();
    if (codigo.length < 6) { setFeedback({ type: 'error', text: 'Leia o QR ou informe um código válido.' }); return; }
    setLoading(true); setFeedback(null); setCoupon(null); setScannerOpen(false); setCode(codigo);
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch('/api/cupons/consultar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify({ codigo }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Não foi possível consultar o cupom.');
      setCoupon(result.cupom); setFeedback({ type: 'success', text: 'Cupom localizado. Confira o benefício antes de confirmar.' });
    } catch (error) { setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível consultar.' }); }
    finally { setLoading(false); }
  }

  async function confirm() {
    if (!coupon || !window.confirm('Confirmar o uso deste cupom? Esta ação fica registrada e não poderá ser revertida.')) return;
    setLoading(true); setFeedback(null);
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch('/api/cupons/usar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify({ codigo: code }) });
      const result = await response.json(); if (!response.ok || !result.ok) throw new Error(result.motivo || result.error || 'Cupom não pôde ser confirmado.');
      setCoupon(null); setCode(''); setFeedback({ type: 'success', text: 'Cupom confirmado. O uso e o responsável foram registrados na auditoria.' });
    } catch (error) { setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível confirmar.' }); }
    finally { setLoading(false); }
  }

  return <main className="min-h-screen bg-stone-950 px-4 py-8 text-white"><section className="mx-auto grid max-w-xl gap-5 rounded-2xl border border-amber-500/40 bg-stone-900 p-6 shadow-2xl"><header><span className="text-xs font-bold uppercase tracking-[.2em] text-amber-400">O Rei do Cupim · operação</span><h1 className="mt-2 text-3xl font-black">Validar cupom</h1><p className="mt-2 text-sm text-stone-300">Leia o QR do cliente ou digite o código recebido no WhatsApp.</p><Link href="/caixa/roleta" className="mt-4 inline-flex rounded-lg border border-amber-400 px-3 py-2 text-sm font-black text-amber-300">Gerar QR da Roleta V2</Link></header>
    {!coupon && !scannerOpen && <button onClick={() => setScannerOpen(true)} className="rounded-xl bg-amber-500 py-4 font-black text-stone-950">Abrir câmera para ler QR</button>}
    {scannerOpen && <div className="overflow-hidden rounded-xl border-2 border-amber-400 bg-black"><Scanner onScan={(items) => { const raw = items[0]?.rawValue; if (raw) consult(raw); }} onError={() => setFeedback({ type: 'error', text: 'Não foi possível abrir a câmera. Digite o código.' })} styles={{ container: { width: '100%', aspectRatio: '1 / 1' } }} /><button onClick={() => setScannerOpen(false)} className="w-full bg-stone-800 py-3 text-sm font-bold">Fechar câmera</button></div>}
    <div className="flex gap-2"><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Código do cupom" className="min-w-0 flex-1 rounded-lg border border-stone-600 bg-stone-950 px-3 py-3 text-center font-mono tracking-widest outline-none focus:border-amber-400" /><button onClick={() => consult()} disabled={loading} className="rounded-lg bg-blue-600 px-4 font-bold disabled:opacity-50">Consultar</button></div>
    {feedback && <div className={`rounded-lg border p-3 text-sm ${feedback.type === 'error' ? 'border-red-500 bg-red-950/40 text-red-100' : 'border-emerald-500 bg-emerald-950/40 text-emerald-100'}`}>{feedback.text}</div>}
    {coupon && <section className="grid gap-4 rounded-xl border border-emerald-500 bg-emerald-950/30 p-5"><div><span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Benefício</span><h2 className="mt-1 text-2xl font-black">{labels[coupon.tipo_premio] || coupon.tipo_premio}</h2><p className="mt-2 text-sm text-stone-300">Canal: {coupon.canal_uso} · expira em {new Date(coupon.expira_em).toLocaleDateString('pt-BR')}</p>{coupon.valor_desconto_percentual && <p className="mt-1 text-sm text-stone-300">Desconto: {coupon.valor_desconto_percentual}%</p>}</div>{coupon.modo_teste ? <div className="rounded-lg bg-amber-950/60 p-3 text-sm text-amber-100">Este é um cupom de teste: ele não pode ser usado na operação real.</div> : <button onClick={confirm} disabled={loading} className="rounded-xl bg-emerald-600 py-4 text-lg font-black disabled:opacity-50">{loading ? 'Confirmando…' : 'Confirmar uso do cupom'}</button>}<button onClick={() => { setCoupon(null); setCode(''); setFeedback(null); }} className="text-sm font-bold text-stone-300 underline">Nova consulta</button></section>}
  </section></main>;
}
