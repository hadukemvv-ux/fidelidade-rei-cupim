'use client';

import { useEffect, useState } from 'react';
import { fetchAdmin } from '@/lib/adminFetch';

type Event = { id: number; entidade: string; entidade_id: string; acao: string; actor_email?: string | null; actor_papel?: string | null; origem?: string; motivo?: string | null; criado_em: string; fonte: string };

export default function AuditoriaPage() {
  const [events, setEvents] = useState<Event[]>([]); const [error, setError] = useState('');
  useEffect(() => { fetchAdmin('/api/admin/auditoria').then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setEvents(data.eventos || []); }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Não foi possível carregar.')); }, []);
  return <div className="admin-operators"><section className="admin-notice"><strong>Histórico operacional</strong><span>Mostra liberações de acesso e eventos de cupons. Registros não são apagados quando um acesso é suspenso.</span></section>{error && <div className="admin-notice error"><span>{error}</span></div>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Quando</th><th>Ação</th><th>Responsável</th><th>Detalhe</th></tr></thead><tbody>{events.map((event) => <tr key={`${event.fonte}-${event.id}`}><td>{new Date(event.criado_em).toLocaleString('pt-BR')}</td><td><strong>{event.acao}</strong><small>{event.entidade}</small></td><td>{event.actor_email || 'Sistema'}</td><td>{event.motivo || event.origem || '—'}</td></tr>)}{!events.length && <tr><td colSpan={4}>Nenhum evento registrado ainda.</td></tr>}</tbody></table></div></div>;
}
