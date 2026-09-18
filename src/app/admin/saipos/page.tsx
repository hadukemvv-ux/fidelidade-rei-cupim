'use client';

import { useEffect, useState } from 'react';
import { fetchAdmin } from '@/lib/adminFetch';

type Diagnostic = {
  ok?: boolean;
  dia?: string;
  campo_data_consultado?: 'shift_date' | 'created_at' | 'updated_at';
  referencia_consultada?: string | null;
  valor_aproximado_consultado?: number | null;
  vendas_consultadas?: number;
  vendas_encontradas?: number;
  amostras?: Array<{
    id_sale: number | null;
    total_amount: number | null;
    canceled: string | null;
    created_at: string | null;
    updated_at: string | null;
    table_order: { id_store_table: string | null; id_store_order_card: string | null; status: string | null } | null;
    payments: Array<{ payment_amount: number | null; desc_store_payment_type: string | null; created_at: string | null; available_fields: string[] }>;
  }>;
  observacao?: string;
  error?: string;
  status_fornecedor?: number;
};

type SavedReference = {
  id_pedido_impresso: string | null;
  mesa_referencia: string | null;
  data_operacional: string | null;
  valor_esperado: number | null;
  situacao: string | null;
  registrada_em: string;
};

function todaySaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export default function SaiposPage() {
  const [day, setDay] = useState(todaySaoPaulo());
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [dateField, setDateField] = useState<'shift_date' | 'created_at' | 'updated_at'>('shift_date');
  const [data, setData] = useState<Diagnostic | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedReference, setSavedReference] = useState<SavedReference | null>(null);

  useEffect(() => {
    fetchAdmin('/api/admin/saipos/referencia-teste', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setSavedReference(payload?.referencia || null))
      .catch(() => setSavedReference(null));
  }, []);

  async function diagnose() {
    setLoading(true); setData(null);
    try {
      const params = new URLSearchParams({ dia: day });
      params.set('campo_data', dateField);
      if (reference.trim()) params.set('referencia', reference.trim());
      if (amount.trim()) params.set('valor', amount.trim().replace(',', '.'));
      const response = await fetchAdmin(`/api/admin/saipos/diagnostico?${params}`, { cache: 'no-store' });
      setData(await response.json().catch(() => ({ error: 'Resposta inválida do servidor.' })));
    } catch {
      setData({ error: 'Não foi possível falar com o servidor.' });
    } finally { setLoading(false); }
  }

  return <div className="space-y-8">
    <section className="admin-notice"><strong>Teste seguro da conexão Saipos</strong><span>Esta tela apenas consulta vendas do dia escolhido. Ela nunca cria cliente, distribui pontos, gera QR Code ou muda qualquer dado do Clube.</span></section>
    {savedReference && <section className="admin-notice"><strong>Referência guardada para a conferência</strong><span>Pedido {savedReference.id_pedido_impresso || '—'} · mesa {savedReference.mesa_referencia || '—'} · {savedReference.data_operacional || '—'} · {savedReference.valor_esperado === null ? 'valor não informado' : savedReference.valor_esperado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Situação: aguardando consulta técnica. Esta referência não contém foto ou dados de cliente.</span></section>}
    <section className="admin-operator-invite">
      <div className="admin-section-title"><div><span>Prova de conceito</span><h2>Consultar um dia</h2></div></div>
      <label><span>Data da venda de teste</span><input type="date" value={day} onChange={(event) => setDay(event.target.value)} /></label>
      <label><span>Usar data da</span><select value={dateField} onChange={(event) => setDateField(event.target.value as typeof dateField)}><option value="shift_date">Venda/turno (padrão)</option><option value="updated_at">Última atualização (pagamento)</option><option value="created_at">Criação da venda</option></select></label>
      <label><span>Mesa, comanda ou ID do pedido (opcional)</span><input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={80} placeholder="Ex.: 99 ou 872482756" /></label>
      <label><span>Valor aproximado (opcional)</span><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" maxLength={12} placeholder="Ex.: 286,00" /></label>
      <button type="button" onClick={diagnose} disabled={loading}>{loading ? 'Consultando…' : 'Consultar Saipos sem alterar dados'}</button>
    </section>
    {data?.error && <section className="admin-notice error"><strong>Consulta não concluída</strong><span>{data.error}{data.status_fornecedor ? ` Código do fornecedor: ${data.status_fornecedor}.` : ''}</span></section>}
    {data?.ok && <>
      <section className="admin-notice"><strong>Conexão confirmada</strong><span>{data.vendas_encontradas} venda(s) encontrada(s) para {data.referencia_consultada ? `mesa/comanda ${data.referencia_consultada}` : data.valor_aproximado_consultado !== null && data.valor_aproximado_consultado !== undefined ? `valor próximo de R$ ${data.valor_aproximado_consultado.toFixed(2)}` : data.dia}, usando {data.campo_data_consultado === 'updated_at' ? 'a última atualização' : data.campo_data_consultado === 'created_at' ? 'a criação' : 'a data do turno'}. {data.observacao}</span></section>
      <section>
        <div className="admin-section-title"><div><span>Amostra técnica sem dados pessoais</span><h2>Campos retornados pela Saipos</h2></div></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Venda</th><th>Valor</th><th>Cancelada</th><th>Mesa/comanda</th><th>Atualizada</th><th>Pagamento</th></tr></thead><tbody>{(data.amostras || []).map((sale, index) => <tr key={`${sale.id_sale}-${index}`}><td>{sale.id_sale ?? '—'}</td><td>{sale.total_amount === null ? '—' : sale.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td>{sale.canceled ?? 'não informado'}</td><td>{sale.table_order ? `${sale.table_order.id_store_table || '—'} / ${sale.table_order.id_store_order_card || '—'} (${sale.table_order.status || 'sem status'})` : 'não informado'}</td><td>{sale.updated_at ? new Date(sale.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td><td>{sale.payments.length ? sale.payments.map((payment) => [payment.desc_store_payment_type || 'forma não informada', payment.payment_amount === null ? null : payment.payment_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })].filter(Boolean).join(' · ')).join(' / ') : 'não informado'}</td></tr>)}{!data.amostras?.length && <tr><td colSpan={6}>Nenhuma venda retornada para esta data.</td></tr>}</tbody></table></div>
      </section>
      <section className="admin-operator-invite"><h2>O que conferir agora</h2><p>Localize a venda de teste pelo número e valor. Veja se há campos de pagamento e o status da mesa/comanda. Compare primeiro uma venda paga; depois, em outro momento, uma venda cancelada ou estornada. Nenhum dado pessoal de cliente é mostrado aqui.</p></section>
    </>}
  </div>;
}
