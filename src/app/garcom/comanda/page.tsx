'use client';

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function EnviarComandaPage() {
  const [mesa, setMesa] = useState('');
  const [imagem, setImagem] = useState<File | null>(null);
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (!data.session) window.location.assign('/login'); }); }, []);

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    if (!imagem) { setNotice('Escolha a foto da comanda antes de enviar.'); return; }
    if (imagem.size > 5 * 1024 * 1024) { setNotice('A foto deve ter no máximo 5 MB.'); return; }
    setSending(true); setNotice('');
    try {
      const { data } = await supabase.auth.getSession();
      const body = new FormData(); body.set('mesa_referencia', mesa.trim()); body.set('imagem', imagem);
      const response = await fetch('/api/roleta-v2/comandas', { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token || ''}` }, body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível enviar a comanda.');
      setMesa(''); setImagem(null); const input = document.getElementById('foto-comanda') as HTMLInputElement | null; if (input) input.value = '';
      setNotice(`Comanda ${result.comanda.mesa_referencia} enviada para conferência. Nenhum QR ou prêmio foi liberado.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível enviar a comanda.'); }
    finally { setSending(false); }
  }

  return <main className="min-h-screen bg-stone-950 px-4 py-8 text-white"><section className="mx-auto grid max-w-xl gap-5 rounded-2xl border border-amber-500/40 bg-stone-900 p-6 shadow-2xl"><header><span className="text-xs font-bold uppercase tracking-[.2em] text-amber-400">O Rei do Cupim · operação</span><h1 className="mt-2 text-3xl font-black">Enviar comanda</h1><p className="mt-2 text-sm text-stone-300">A foto fica privada. A gestão confere o pagamento antes de qualquer QR da Roleta.</p></header><form className="grid gap-4" onSubmit={enviar}><label className="grid gap-1 text-sm font-bold">Mesa ou comanda<input value={mesa} onChange={(event) => setMesa(event.target.value)} required maxLength={80} placeholder="Ex.: Mesa 99" className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-3 font-normal outline-none focus:border-amber-400" /></label><label className="grid gap-1 text-sm font-bold">Foto da comanda<input id="foto-comanda" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setImagem(event.target.files?.[0] || null)} className="rounded-lg border border-dashed border-stone-600 bg-stone-950 px-3 py-3 font-normal text-stone-300" /></label><small className="text-stone-400">Aceita JPEG, PNG ou WebP até 5 MB. Não fotografe documentos pessoais ou cartões.</small><button disabled={sending} className="rounded-xl bg-amber-500 py-4 font-black text-stone-950 disabled:opacity-50">{sending ? 'Enviando…' : 'Enviar para conferência'}</button></form>{notice && <div className="rounded-lg border border-stone-600 bg-stone-950 p-3 text-sm text-stone-100">{notice}</div>}<Link href="/" className="text-sm font-bold text-amber-300 underline">Voltar ao Clube</Link></section></main>;
}
