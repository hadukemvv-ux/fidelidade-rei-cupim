'use client';

import { useState } from 'react';
import { fetchAdmin } from '@/lib/adminFetch';

type Status = { status: string | null; at: string | null; duration_seconds: number | null };
type Delivery = {
  id_sale: string | null;
  sale_number: string | null;
  created_at: string | null;
  canceled: string | null;
  channel_class: string;
  partner_name: string | null;
  delivery_time: number | null;
  delivery_by: string | null;
  history_available: boolean;
  statuses: Status[];
};
type Result = {
  ok?: boolean;
  error?: string;
  status_fornecedor?: number;
  day?: string;
  sales_scanned?: number;
  delivery_count?: number;
  by_channel?: Record<string, number>;
  history_available?: boolean;
  history_error_status?: number | null;
  history_complete?: boolean;
  shown_count?: number;
  rows?: Delivery[];
};

function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function channelLabel(row: Delivery) {
  switch (row.channel_class) {
    case 'parceiro_informado_canal_desconhecido': return `Loja no parceiro: ${row.partner_name || 'não informada'} — canal desconhecido`;
    default: return 'Sem parceiro informado — canal desconhecido';
  }
}

export default function SaiposDeliveriesPage() {
  const [day, setDay] = useState(today());
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function consult() {
    setLoading(true);
    setData(null);
    try {
      const response = await fetchAdmin(`/api/admin/saipos/entregas?dia=${encodeURIComponent(day)}`, { cache: 'no-store' });
      const result = await response.json();
      setData(result);
    } catch {
      setData({ error: 'Não foi possível consultar a Saipos.' });
    } finally {
      setLoading(false);
    }
  }

  return <div className="admin-report">
    <section className="admin-notice"><strong>Diagnóstico de entregas — somente leitura</strong><span>Esta página consulta a Saipos sob demanda. Não cria cupons, altera pedidos ou determina automaticamente que uma entrega atrasou. A API ainda não permitiu distinguir com segurança canal próprio de marketplace.</span></section>
    <section className="admin-toolbar">
      <label><span>Data de criação dos pedidos</span><input type="date" value={day} onChange={(event) => setDay(event.target.value)} /></label>
      <button type="button" onClick={consult} disabled={loading}>{loading ? 'Consultando…' : 'Consultar entregas'}</button>
    </section>
    {data?.error && <section className="admin-notice error"><strong>Consulta não concluída</strong><span>{data.error}{data.status_fornecedor ? ` Código Saipos: ${data.status_fornecedor}.` : ''}</span></section>}
    {data?.ok && <>
      <section className="admin-kpi-grid" aria-label="Resumo de entregas">
        <article><span>Vendas consultadas</span><strong>{data.sales_scanned ?? 0}</strong><small>Todos os tipos retornados na data</small></article>
        <article><span>Entregas</span><strong>{data.delivery_count ?? 0}</strong><small>Tipo de venda 1 na Saipos</small></article>
        <article><span>Com parceiro informado</span><strong>{data.by_channel?.parceiro_informado_canal_desconhecido ?? 0}</strong><small>Nome da loja no parceiro não revela a origem</small></article>
        <article><span>Sem parceiro informado</span><strong>{data.by_channel?.sem_parceiro_informado ?? 0}</strong><small>Também não comprova canal próprio</small></article>
      </section>
      <section className="admin-notice"><strong>O que o teste pode provar</strong><span>{data.history_available ? 'A consulta de histórico respondeu.' : `O histórico de status não respondeu${data.history_error_status ? ` (código ${data.history_error_status})` : ''}; horários de entrega não foram confirmados.`} {data.history_available && !data.history_complete ? 'O histórico ultrapassou o limite da consulta; resultados podem estar incompletos.' : ''} O tempo estimado retornado pela venda ainda precisa ser comparado ao prazo mostrado ao cliente. Nenhum pedido desta tela é declarado atrasado.</span></section>
      <section>
        <div className="admin-section-title"><div><span>Pedidos de entrega</span><h2>Monitoramento técnico</h2></div><small>Mostrando até 150 pedidos recentes de {data.delivery_count ?? 0}</small></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Pedido</th><th>Origem</th><th>Criado</th><th>Tempo estimado</th><th>Situação</th><th>Etapas</th></tr></thead><tbody>
          {(data.rows || []).map((row, index) => <tr key={`${row.id_sale}-${index}`}>
            <td><strong>{row.sale_number || row.id_sale || '—'}</strong><small>ID {row.id_sale || 'não informado'}</small></td>
            <td>{channelLabel(row)}</td>
            <td>{row.created_at || '—'}</td>
            <td>{row.delivery_time === null ? 'Não informado' : `${row.delivery_time} (unidade a confirmar)`}</td>
            <td>{row.canceled === 'Y' ? 'Cancelado' : row.canceled === 'N' ? 'Não cancelado' : 'Não informado'}</td>
            <td>{row.history_available ? <details><summary>{row.statuses.length} etapa(s)</summary><ol>{row.statuses.map((status, step) => <li key={step}>{status.status || 'Status sem nome'} · {status.at || 'sem horário'}</li>)}</ol></details> : 'Sem histórico'}</td>
          </tr>)}
          {!data.rows?.length && <tr><td colSpan={6}>Nenhuma entrega retornada para a data.</td></tr>}
        </tbody></table></div>
      </section>
    </>}
  </div>;
}
