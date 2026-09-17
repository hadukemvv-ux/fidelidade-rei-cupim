'use client';

import { useState } from 'react';
import { fetchAdmin } from '@/lib/adminFetch';

type Diagnostic = {
  ok?: boolean;
  dia?: string;
  referencia_consultada?: string | null;
  vendas_consultadas?: number;
  vendas_encontradas?: number;
  amostras?: Array<{
    id_sale: number | null;
    total_amount: number | null;
    canceled: string | null;
    table_order: { id_store_table: string | null; id_store_order_card: string | null; status: string | null } | null;
    payments: Array<{ available_fields: string[] }>;
  }>;
  observacao?: string;
  error?: string;
  status_fornecedor?: number;
};

function todaySaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export default function SaiposPage() {
  const [day, setDay] = useState(todaySaoPaulo());
  const [reference, setReference] = useState('');
  const [data, setData] = useState<Diagnostic | null>(null);
  const [loading, setLoading] = useState(false);

  async function diagnose() {
    setLoading(true); setData(null);
    try {
      const params = new URLSearchParams({ dia: day });
      if (reference.trim()) params.set('referencia', reference.trim());
      const response = await fetchAdmin(`/api/admin/saipos/diagnostico?${params}`, { cache: 'no-store' });
      setData(await response.json().catch(() => ({ error: 'Resposta inválida do servidor.' })));
    } catch {
      setData({ error: 'Não foi possível falar com o servidor.' });
    } finally { setLoading(false); }
  }

  return <div className="space-y-8">
    <section className="admin-notice"><strong>Teste seguro da conexão Saipos</strong><span>Esta tela apenas consulta vendas do dia escolhido. Ela nunca cria cliente, distribui pontos, gera QR Code ou muda qualquer dado do Clube.</span></section>
    <section className="admin-operator-invite">
      <div className="admin-section-title"><div><span>Prova de conceito</span><h2>Consultar um dia</h2></div></div>
      <label><span>Data da venda de teste</span><input type="date" value={day} onChange={(event) => setDay(event.target.value)} /></label>
      <label><span>Mesa ou comanda (opcional)</span><input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={80} placeholder="Ex.: 99" /></label>
      <button type="button" onClick={diagnose} disabled={loading}>{loading ? 'Consultando…' : 'Consultar Saipos sem alterar dados'}</button>
    </section>
    {data?.error && <section className="admin-notice error"><strong>Consulta não concluída</strong><span>{data.error}{data.status_fornecedor ? ` Código do fornecedor: ${data.status_fornecedor}.` : ''}</span></section>}
    {data?.ok && <>
      <section className="admin-notice"><strong>Conexão confirmada</strong><span>{data.vendas_encontradas} venda(s) encontrada(s) para {data.referencia_consultada ? `mesa/comanda ${data.referencia_consultada}` : data.dia}. {data.observacao}</span></section>
      <section>
        <div className="admin-section-title"><div><span>Amostra técnica sem dados pessoais</span><h2>Campos retornados pela Saipos</h2></div></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Venda</th><th>Valor</th><th>Cancelada</th><th>Mesa/comanda</th><th>Campos de pagamento</th></tr></thead><tbody>{(data.amostras || []).map((sale, index) => <tr key={`${sale.id_sale}-${index}`}><td>{sale.id_sale ?? '—'}</td><td>{sale.total_amount === null ? '—' : sale.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td>{sale.canceled ?? 'não informado'}</td><td>{sale.table_order ? `${sale.table_order.id_store_table || '—'} / ${sale.table_order.id_store_order_card || '—'} (${sale.table_order.status || 'sem status'})` : 'não informado'}</td><td>{sale.payments.length ? sale.payments.flatMap((payment) => payment.available_fields).filter((value, i, all) => all.indexOf(value) === i).join(', ') : 'não informado'}</td></tr>)}{!data.amostras?.length && <tr><td colSpan={5}>Nenhuma venda retornada para esta data.</td></tr>}</tbody></table></div>
      </section>
      <section className="admin-operator-invite"><h2>O que conferir agora</h2><p>Localize a venda de teste pelo número e valor. Veja se há campos de pagamento e o status da mesa/comanda. Compare primeiro uma venda paga; depois, em outro momento, uma venda cancelada ou estornada. Nenhum dado pessoal de cliente é mostrado aqui.</p></section>
    </>}
  </div>;
}
