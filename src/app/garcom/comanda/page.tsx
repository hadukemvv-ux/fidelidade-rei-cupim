'use client';

import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { lerFotosDaComanda } from '@/lib/comandaOcr';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
type Enviada = { id: string; mesa_referencia: string };
function hojeSaoPaulo() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }

export default function EnviarComandaPage() {
  const router = useRouter();
  const [mesa, setMesa] = useState(''); const [fotoCabecalho, setFotoCabecalho] = useState<File | null>(null); const [fotoTotal, setFotoTotal] = useState<File | null>(null); const [enviada, setEnviada] = useState<Enviada | null>(null);
  const [data, setData] = useState(hojeSaoPaulo()); const [horario, setHorario] = useState(''); const [idPedido, setIdPedido] = useState(''); const [valor, setValor] = useState(''); const [confirmou, setConfirmou] = useState(false);
  const [notice, setNotice] = useState(''); const [sending, setSending] = useState(false); const [reading, setReading] = useState(false); const [qr, setQr] = useState<{ url: string; expira: string; faixa: string } | null>(null);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (!data.session) router.replace('/login'); }); }, [router]);
  async function lerFotos() {
    if (!fotoCabecalho || !fotoTotal) { setNotice('Escolha as duas fotos antes de iniciar a leitura.'); return; }
    setReading(true); setNotice('Preparando a leitura local…');
    try {
      const leitura = await lerFotosDaComanda(fotoCabecalho, fotoTotal, setNotice);
      if (leitura.mesa) setMesa(leitura.mesa); if (leitura.data_operacional) setData(leitura.data_operacional); if (leitura.horario_abertura) setHorario(leitura.horario_abertura); if (leitura.id_pedido_impresso) setIdPedido(leitura.id_pedido_impresso); if (leitura.valor_confirmado) setValor(leitura.valor_confirmado);
      setNotice(leitura.texto_detectado ? 'Sugestões preenchidas pela leitura local. Compare tudo com o papel antes de enviar.' : 'Não consegui ler campos suficientes. Preencha manualmente e confira o papel.');
    } catch { setNotice('A leitura automática não concluiu. Você pode preencher os dados manualmente e continuar.'); } finally { setReading(false); }
  }
  async function enviarFoto(event: React.FormEvent) {
    event.preventDefault(); if (!fotoCabecalho || !fotoTotal) { setNotice('Escolha as duas fotos da comanda antes de enviar.'); return; } if (fotoCabecalho.size > 5 * 1024 * 1024 || fotoTotal.size > 5 * 1024 * 1024) { setNotice('Cada foto deve ter no máximo 5 MB.'); return; }
    setSending(true); setNotice('');
    try {
      const { data } = await supabase.auth.getSession(); const body = new FormData(); body.set('mesa_referencia', mesa.trim()); body.set('foto_cabecalho', fotoCabecalho); body.set('foto_total', fotoTotal);
      const response = await fetch('/api/roleta-v2/comandas', { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token || ''}` }, body }); const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível enviar a comanda.');
      setEnviada({ id: result.comanda.id, mesa_referencia: result.comanda.mesa_referencia }); setNotice('Foto guardada de forma privada. Agora confira os dados visíveis na comanda antes de liberar o QR de teste.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível enviar a comanda.'); } finally { setSending(false); }
  }
  async function liberarQr(event: React.FormEvent) {
    event.preventDefault(); if (!enviada || !confirmou) { setNotice('Marque a confirmação depois de comparar todos os dados com a comanda.'); return; }
    const valorConfirmado = Number(valor.replace(/\./g, '').replace(',', '.')); if (!Number.isFinite(valorConfirmado)) { setNotice('Informe um valor válido.'); return; }
    setSending(true); setNotice('');
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const response = await fetch(`/api/roleta-v2/comandas/${enviada.id}/liberar`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessao.session?.access_token || ''}` }, body: JSON.stringify({ data_operacional: data, horario_abertura: horario, id_pedido_impresso: idPedido, valor_confirmado: valorConfirmado, confirmou_comanda: true }) }); const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível liberar o QR.');
      setQr({ url: `${window.location.origin}/roleta/v2?token=${encodeURIComponent(result.token)}`, expira: result.expira_em, faixa: result.faixa }); setNotice('QR de teste liberado e auditado. Mostre-o ao cliente; ele expira após um giro ou no horário indicado.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível liberar o QR.'); } finally { setSending(false); }
  }
  function novaComanda() { setMesa(''); setFotoCabecalho(null); setFotoTotal(null); setEnviada(null); setHorario(''); setIdPedido(''); setValor(''); setConfirmou(false); setQr(null); setNotice(''); for (const id of ['foto-cabecalho', 'foto-total']) { const input = document.getElementById(id) as HTMLInputElement | null; if (input) input.value = ''; } }

  return <main className="min-h-screen bg-stone-950 px-4 py-8 text-white"><section className="mx-auto grid max-w-xl gap-5 rounded-2xl border border-amber-500/40 bg-stone-900 p-6 shadow-2xl"><header><span className="text-xs font-bold uppercase tracking-[.2em] text-amber-400">O Rei do Cupim · piloto auditável</span><h1 className="mt-2 text-3xl font-black">Comanda e QR de teste</h1><p className="mt-2 text-sm text-stone-300">Foto privada → conferência do garçom → QR único → reconciliação posterior com a Saipos. Nenhum prêmio comercial é válido neste piloto.</p></header>
    {!enviada && <form className="grid gap-4" onSubmit={enviarFoto}><label className="grid gap-1 text-sm font-bold">Mesa ou comanda<input value={mesa} onChange={(event) => setMesa(event.target.value)} required maxLength={80} placeholder="Ex.: Mesa 99" className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-3 font-normal outline-none focus:border-amber-400" /></label><label className="grid gap-1 text-sm font-bold">Foto 1 — parte de cima (mesa, abertura e ID)<input id="foto-cabecalho" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setFotoCabecalho(event.target.files?.[0] || null)} className="rounded-lg border border-dashed border-stone-600 bg-stone-950 px-3 py-3 font-normal text-stone-300" /></label><label className="grid gap-1 text-sm font-bold">Foto 2 — parte de baixo (total e pagamento)<input id="foto-total" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setFotoTotal(event.target.files?.[0] || null)} className="rounded-lg border border-dashed border-stone-600 bg-stone-950 px-3 py-3 font-normal text-stone-300" /></label><small className="text-stone-400">JPEG, PNG ou WebP até 5 MB cada. A leitura ocorre no próprio navegador e apenas sugere os campos; a conferência humana continua obrigatória.</small><button type="button" onClick={lerFotos} disabled={reading || sending} className="rounded-xl border border-amber-400 py-3 font-black text-amber-300 disabled:opacity-50">{reading ? 'Lendo fotos…' : 'Ler dados das fotos'}</button><button disabled={sending || reading} className="rounded-xl bg-amber-500 py-4 font-black text-stone-950 disabled:opacity-50">{sending ? 'Guardando fotos…' : 'Guardar 2 fotos e conferir'}</button></form>}
    {enviada && !qr && <form className="grid gap-4 rounded-xl border border-amber-500/40 bg-amber-950/20 p-4" onSubmit={liberarQr}><div><strong>Comanda {enviada.mesa_referencia} registrada.</strong><p className="mt-1 text-sm text-stone-300">Confira cada sugestão do OCR contra o papel antes de continuar. A leitura não confirma pagamento nem libera QR sozinha.</p></div><label className="grid gap-1 text-sm font-bold">Data operacional<input type="date" value={data} onChange={(event) => setData(event.target.value)} required className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-3 font-normal" /></label><label className="grid gap-1 text-sm font-bold">Horário de abertura mostrado na comanda<input type="time" value={horario} onChange={(event) => setHorario(event.target.value)} required className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-3 font-normal" /></label><label className="grid gap-1 text-sm font-bold">ID do Pedido impresso<input inputMode="numeric" value={idPedido} onChange={(event) => setIdPedido(event.target.value.replace(/\D/g, ''))} required minLength={4} maxLength={30} placeholder="Ex.: 872482756" className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-3 font-normal" /></label><label className="grid gap-1 text-sm font-bold">Valor total mostrado na comanda<input inputMode="decimal" value={valor} onChange={(event) => setValor(event.target.value)} required placeholder="Ex.: 274,45" className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-3 font-normal" /></label><label className="flex gap-2 text-sm text-stone-100"><input type="checkbox" checked={confirmou} onChange={(event) => setConfirmou(event.target.checked)} /> Confirmo que mesa, horário, ID do pedido e valor acima são os mesmos da comanda fotografada.</label><button disabled={sending || !confirmou} className="rounded-xl bg-amber-500 py-4 font-black text-stone-950 disabled:opacity-50">{sending ? 'Liberando…' : 'Liberar QR de teste'}</button></form>}
    {qr && <section className="grid justify-items-center gap-4 rounded-xl border border-emerald-500 bg-emerald-950/30 p-5 text-center"><QRCodeSVG value={qr.url} size={220} includeMargin /><strong>QR de teste pronto para o cliente</strong><p className="text-sm text-stone-300">Faixa {qr.faixa}. Expira às {new Date(qr.expira).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. O cupom resultante será marcado como teste.</p><button onClick={novaComanda} className="rounded-lg border border-amber-400 px-4 py-2 font-bold text-amber-300">Nova comanda</button></section>}
    {notice && <div className="rounded-lg border border-stone-600 bg-stone-950 p-3 text-sm text-stone-100">{notice}</div>}<Link href="/" className="text-sm font-bold text-amber-300 underline">Voltar ao Clube</Link></section></main>;
}
