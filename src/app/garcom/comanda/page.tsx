'use client';

import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { lerFotosDaComanda, type LeituraComanda, validarLeituraParaPiloto } from '@/lib/comandaOcr';
import { OperationalLogout } from '@/components/OperationalLogout';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
type Enviada = { id: string; mesa_referencia: string };

function paraNumero(valor: string) {
  return Number(valor.replace(/\./g, '').replace(',', '.'));
}

export default function EnviarComandaPage() {
  const router = useRouter();
  const [fotoCabecalho, setFotoCabecalho] = useState<File | null>(null);
  const [fotoTotal, setFotoTotal] = useState<File | null>(null);
  const [leitura, setLeitura] = useState<LeituraComanda | null>(null);
  const [valorDigitado, setValorDigitado] = useState('');
  const [enviada, setEnviada] = useState<Enviada | null>(null);
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const [reading, setReading] = useState(false);
  const [qr, setQr] = useState<{ url: string; expira: string; faixa: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (!data.session) router.replace('/login'); });
  }, [router]);

  function refazerLeitura() {
    setLeitura(null); setValorDigitado(''); setEnviada(null); setNotice('');
    for (const id of ['foto-cabecalho', 'foto-total']) {
      const input = document.getElementById(id) as HTMLInputElement | null;
      if (input) input.value = '';
    }
    setFotoCabecalho(null); setFotoTotal(null);
  }

  async function lerFotos(event: React.FormEvent) {
    event.preventDefault();
    if (!fotoCabecalho || !fotoTotal) { setNotice('Escolha as duas fotos antes de continuar.'); return; }
    if (fotoCabecalho.size > 5 * 1024 * 1024 || fotoTotal.size > 5 * 1024 * 1024) { setNotice('Cada foto deve ter no máximo 5 MB.'); return; }
    setReading(true); setNotice('Lendo a comanda…');
    try {
      const resultado = await lerFotosDaComanda(fotoCabecalho, fotoTotal, setNotice);
      const validacao = validarLeituraParaPiloto(resultado);
      if (!validacao.pronta) {
        setLeitura(null);
        setNotice(`Não consegui ler ${validacao.camposAusentes.join(', ')}. Tire novas fotos nítidas, sem reflexo e com o papel inteiro visível.`);
        return;
      }
      setLeitura(resultado);
      setNotice('Comanda identificada. Digite somente o valor total para conferir e gerar o QR de teste.');
    } catch {
      setLeitura(null);
      setNotice('A leitura não concluiu. Tire novas fotos nítidas e tente novamente.');
    } finally { setReading(false); }
  }

  async function liberarQr(comanda: Enviada) {
    if (!leitura) return;
    const { data: sessao } = await supabase.auth.getSession();
    const response = await fetch(`/api/roleta-v2/comandas/${comanda.id}/liberar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessao.session?.access_token || ''}` },
      body: JSON.stringify({
        data_operacional: leitura.data_operacional,
        horario_abertura: leitura.horario_abertura,
        id_pedido_impresso: leitura.id_pedido_impresso,
        valor_confirmado: paraNumero(valorDigitado),
        confirmou_comanda: true,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível liberar o QR.');
    setQr({ url: `${window.location.origin}/roleta/v2?token=${encodeURIComponent(result.token)}`, expira: result.expira_em, faixa: result.faixa });
  }

  async function guardarELiberar(event: React.FormEvent) {
    event.preventDefault();
    if (!leitura || !fotoCabecalho || !fotoTotal) return;
    const valorConfirmado = paraNumero(valorDigitado);
    const valorLido = paraNumero(leitura.valor_confirmado || '');
    if (!Number.isFinite(valorConfirmado) || valorConfirmado < 0) { setNotice('Digite o valor total exatamente como aparece na comanda.'); return; }
    if (!Number.isFinite(valorLido) || Math.abs(valorConfirmado - valorLido) > 0.01) {
      setNotice(`O valor digitado não confere com o valor lido (${leitura.valor_confirmado}). Tire novas fotos para evitar liberar um QR com valor incorreto.`);
      return;
    }
    setSending(true); setNotice('');
    try {
      let comanda = enviada;
      if (!comanda) {
        const { data } = await supabase.auth.getSession();
        const body = new FormData();
        body.set('mesa_referencia', leitura.mesa || '');
        body.set('foto_cabecalho', fotoCabecalho); body.set('foto_total', fotoTotal);
        const response = await fetch('/api/roleta-v2/comandas', { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token || ''}` }, body });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Não foi possível guardar as fotos.');
        comanda = { id: result.comanda.id, mesa_referencia: result.comanda.mesa_referencia };
        setEnviada(comanda);
      }
      await liberarQr(comanda);
      setNotice('QR de teste liberado e auditado. Mostre-o ao cliente; ele expira após um giro ou no horário indicado.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível liberar o QR.');
    } finally { setSending(false); }
  }

  return <main className="min-h-screen bg-stone-950 px-4 py-8 text-white"><section className="mx-auto grid max-w-xl gap-5 rounded-2xl border border-amber-500/40 bg-stone-900 p-6 shadow-2xl">
    <header><div className="flex items-start justify-between gap-4"><div><span className="text-xs font-bold uppercase tracking-[.2em] text-amber-400">O Rei do Cupim · piloto auditável</span><h1 className="mt-2 text-3xl font-black">Comanda e QR de teste</h1></div><OperationalLogout className="rounded-lg border border-stone-600 px-3 py-2 text-sm font-bold text-stone-200 disabled:opacity-50" /></div><p className="mt-2 text-sm text-stone-300">Duas fotos → leitura do pedido → confirmação do valor → QR único → reconciliação posterior com a Saipos. Nenhum prêmio comercial é válido neste piloto.</p></header>
    {!leitura && !qr && <form className="grid gap-4" onSubmit={lerFotos}><label className="grid gap-1 text-sm font-bold">Foto 1 — parte de cima (mesa, abertura e ID)<input id="foto-cabecalho" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setFotoCabecalho(event.target.files?.[0] || null)} className="rounded-lg border border-dashed border-stone-600 bg-stone-950 px-3 py-3 font-normal text-stone-300" /></label><label className="grid gap-1 text-sm font-bold">Foto 2 — parte de baixo (total e pagamento)<input id="foto-total" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setFotoTotal(event.target.files?.[0] || null)} className="rounded-lg border border-dashed border-stone-600 bg-stone-950 px-3 py-3 font-normal text-stone-300" /></label><small className="text-stone-400">JPEG, PNG ou WebP até 5 MB cada. Se a leitura não encontrar mesa, abertura, ID e valor, a comanda não segue.</small><button disabled={reading || sending} className="rounded-xl bg-amber-500 py-4 font-black text-stone-950 disabled:opacity-50">{reading ? 'Lendo comanda…' : 'Ler comanda'}</button></form>}
    {leitura && !qr && <form className="grid gap-4 rounded-xl border border-amber-500/40 bg-amber-950/20 p-4" onSubmit={guardarELiberar}><div><strong>Comanda identificada</strong><dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-stone-200"><div><dt className="text-stone-400">Mesa</dt><dd>{leitura.mesa}</dd></div><div><dt className="text-stone-400">Abertura</dt><dd>{leitura.data_operacional} · {leitura.horario_abertura}</dd></div><div><dt className="text-stone-400">Pedido</dt><dd>{leitura.id_pedido_impresso}</dd></div><div><dt className="text-stone-400">Valor lido</dt><dd>R$ {leitura.valor_confirmado}</dd></div></dl></div><label className="grid gap-1 text-sm font-bold">Confirme o valor total da comanda<input autoFocus inputMode="decimal" value={valorDigitado} onChange={(event) => setValorDigitado(event.target.value)} required placeholder="Ex.: 274,45" className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-3 font-normal" /></label><small className="text-stone-400">Este é o único campo manual. Ele precisa coincidir com a leitura para liberar o QR.</small><button disabled={sending} className="rounded-xl bg-amber-500 py-4 font-black text-stone-950 disabled:opacity-50">{sending ? 'Guardando e liberando…' : 'Gerar QR de teste'}</button><button type="button" onClick={refazerLeitura} disabled={sending} className="text-sm font-bold text-amber-300 underline">Tirar novas fotos</button></form>}
    {qr && <section className="grid justify-items-center gap-4 rounded-xl border border-emerald-500 bg-emerald-950/30 p-5 text-center"><QRCodeSVG value={qr.url} size={220} includeMargin /><strong>QR de teste pronto para o cliente</strong><p className="text-sm text-stone-300">Faixa {qr.faixa}. Expira às {new Date(qr.expira).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. O cupom resultante será marcado como teste.</p><button onClick={refazerLeitura} className="rounded-lg border border-amber-400 px-4 py-2 font-bold text-amber-300">Nova comanda</button></section>}
    {notice && <div className="rounded-lg border border-stone-600 bg-stone-950 p-3 text-sm text-stone-100">{notice}</div>}<Link href="/" className="text-sm font-bold text-amber-300 underline">Voltar ao Clube</Link>
  </section></main>;
}
