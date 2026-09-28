'use client';

import { useState } from 'react';
import { deliveryChoices, deliveryOverdue, type ImmediatePrize } from '@/lib/prizeDeliveryRules';
import { demoProducts, demoSummary, demoTransition, type DemoDelivery } from '@/lib/prizeDeliverySimulation';
import styles from './page.module.css';

const prizeNames: Record<ImmediatePrize, string> = { saideira: 'Saideira · 1 cerveja', expulsadeira: 'Expulsadeira · 2 cervejas', sobremesa: 'Sobremesa · 1 unidade' };
const statusNames = { pendente: 'Escolha pendente', selecionada: 'Aguardando entrega', entregue: 'Entregue', nao_entregue: 'Não entregue' };
const buttonClass = `${styles.primary} rounded-lg bg-stone-900 px-4 py-3 text-sm font-semibold disabled:opacity-40`;
const timeLabel = (value: string) => new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' });

export default function DemoDeliveriesPage() {
  const [records, setRecords] = useState<DemoDelivery[]>([]);
  const [message, setMessage] = useState('');
  const summary = demoSummary(records);

  function add(prize: ImmediatePrize, overdue = false) {
    const createdAt = new Date(Date.now() - (overdue ? 73 * 3600000 : 0)).toISOString();
    setRecords((current) => [...current, { id: crypto.randomUUID(), prize, createdAt, consumedBeerIds: ['beer-a', 'beer-b'], status: 'pendente', events: [] }]);
    setMessage('Prêmio fictício criado. Nenhum giro ou cupom real foi utilizado.');
  }

  function act(id: string, action: Parameters<typeof demoTransition>[1]) {
    try {
      // Eventos do navegador são sequenciais; validar o registro atual impede repetir a entrega/baixa.
      const record = records.find((item) => item.id === id);
      if (!record) throw new Error('Entrega não encontrada.');
      const next = demoTransition(record, action, new Date());
      setRecords((current) => current.map((item) => item.id === id ? next : item));
      setMessage('Etapa simulada registrada. Nenhuma alteração foi enviada à Saipos.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível simular esta etapa.');
    }
  }

  return <div className="grid gap-6">
    <div className="admin-notice"><strong>Laboratório — somente dados fictícios</strong><span>Sem WhatsApp, cupons reais ou alteração de estoque. Ao sair desta página ou recarregar, o ensaio é descartado.</span></div>
    <section className="rounded-xl border border-stone-200 bg-white p-5 text-stone-900">
      <div className="admin-section-title"><div><span>1 · Criar ensaio</span><h2>Qual prêmio o cliente ganhou?</h2></div></div>
      <div className="flex flex-wrap gap-3">{(Object.keys(prizeNames) as ImmediatePrize[]).map((prize) => <button key={prize} className={buttonClass} onClick={() => add(prize)}>{prizeNames[prize]}</button>)}<button className="rounded-lg border border-stone-300 px-4 py-3 text-sm" onClick={() => add('saideira', true)}>Criar pendência de 73h</button></div>
      <p className="mt-3 text-sm text-stone-600">Conta fictícia: consumiu cervejas A e B, ambas de 600 ml. O cliente escolhe qual delas receber.</p>
    </section>
    <p role="status" aria-live="polite" className="text-sm">{message || 'Crie um prêmio para começar. Os itens abaixo são exemplos, não o catálogo da empresa.'}</p>
    <section className="grid gap-4" aria-label="Entregas simuladas">
      {records.map((record, index) => {
        const pending = record.status === 'pendente' || record.status === 'selecionada';
        const choices = deliveryChoices(record.prize, demoProducts, record.consumedBeerIds);
        return <article key={record.id} className="grid gap-4 rounded-xl border border-stone-200 bg-white p-5 text-stone-900">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold">Mesa fictícia {index + 1} · {prizeNames[record.prize]}</h2><p className="mt-1 text-sm text-stone-600">{statusNames[record.status]} · criado em {timeLabel(record.createdAt)}</p></div>{pending && deliveryOverdue(record.createdAt) && <span className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-800">Mais de 72h · resolver pendência</span>}</div>
          {pending && <div className="flex flex-wrap items-end gap-3"><label className="grid gap-2 text-sm font-semibold" htmlFor={`product-${record.id}`}>2 · Item escolhido<select id={`product-${record.id}`} className="rounded-lg border border-stone-300 bg-white p-3" value={record.selectedId ?? ''} onChange={(event) => act(record.id, { type: 'select', productId: event.target.value })}><option value="" disabled>Selecione o produto</option>{choices.map((item) => <option key={item.id} value={item.id}>{item.nome} · {item.unidade}</option>)}</select></label><button className={buttonClass} disabled={record.status !== 'selecionada'} onClick={() => act(record.id, { type: 'deliver' })}>3 · Simular entrega física</button><button className="rounded-lg border border-stone-300 px-4 py-3 text-sm" onClick={() => act(record.id, { type: 'cancel' })}>Não foi entregue</button></div>}
          {record.delivery && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm"><strong>{record.delivery.quantidade} × {record.delivery.produto_nome}</strong> · {record.delivery.unidade}<br />{record.postedAt ? `Baixa simulada em ${timeLabel(record.postedAt)}` : 'Entrega confirmada; falta simular o lançamento na Saipos.'}</p>{!record.postedAt && <button className={buttonClass} onClick={() => act(record.id, { type: 'post' })}>4 · Simular baixa manual</button>}</div>}
          {record.events.length > 0 && <details className="text-sm text-stone-600"><summary className="cursor-pointer">Histórico deste ensaio</summary><ol className="mt-2 grid gap-1">{record.events.map((event, i) => <li key={i}>{timeLabel(event.at)} · {event.actor} · {event.action}</li>)}</ol></details>}
        </article>;
      })}
    </section>
    <section className="rounded-xl border border-stone-200 bg-white p-5 text-stone-900">
      <div className="admin-section-title"><div><span>Fechamento fictício · UTC−3</span><h2>Produtos efetivamente entregues</h2></div></div>
      {summary.length === 0 ? <p className="text-sm text-stone-600">Nenhuma entrega confirmada. Escolher o item não gera saída.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Resumo fictício agrupado por dia, produto e unidade</caption><thead><tr className="border-b"><th className="p-3">Dia</th><th className="p-3">Produto / unidade</th><th className="p-3">Entregues</th><th className="p-3">Baixa simulada</th><th className="p-3">Falta lançar</th></tr></thead><tbody>{summary.map((row) => <tr key={`${row.day}:${row.productId}:${row.unit}`} className="border-b"><td className="p-3">{row.day}</td><td className="p-3">{row.name} · {row.unit}</td><td className="p-3">{row.delivered}</td><td className="p-3">{row.posted}</td><td className="p-3">{row.delivered - row.posted}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
