'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchAdmin } from '@/lib/adminFetch';

type Cliente = {
  id: number; nome: string | null; telefone: string | null; email: string | null; nivel: string | null;
  pontos: number | null; cashback: number | null; tickets: number | null; total_gasto: number | null;
  qtd_pedidos: number | null; ultima_compra: string | null; data_nascimento: string | null;
  aceita_whatsapp_aniversario: boolean | null;
};

async function fetchClientes() {
  const response = await fetchAdmin('/api/admin/clientes', { cache: 'no-store' });
  const json = await response.json();
  if (!response.ok || !json?.ok) throw new Error(json?.error || 'Não foi possível carregar os clientes.');
  return (json.data?.clientes || []) as Cliente[];
}

function money(value: number | null) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function phone(value: string | null) {
  const digits = String(value || '').replace(/\D/g, '').slice(-11);
  if (digits.length !== 11) return value || '—';
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      setClientes(await fetchClientes());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os clientes.');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    async function initialLoad() {
      try {
        const result = await fetchClientes();
        if (active) setClientes(result);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os clientes.');
      } finally {
        if (active) setLoading(false);
      }
    }
    initialLoad();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    if (!query) return clientes;
    const digits = query.replace(/\D/g, '');
    return clientes.filter((cliente) => cliente.nome?.toLocaleLowerCase('pt-BR').includes(query) || (digits && cliente.telefone?.includes(digits)) || cliente.email?.toLocaleLowerCase('pt-BR').includes(query));
  }, [clientes, search]);

  return (
    <div className="admin-clients">
      <div className="admin-toolbar"><label><span>Buscar cliente</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, telefone ou e-mail" /></label><div><strong>{filtered.length.toLocaleString('pt-BR')}</strong><span>{filtered.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}</span></div><button onClick={load} disabled={loading}>Atualizar</button></div>
      {error && <div className="admin-notice error"><strong>Falha ao carregar clientes.</strong><span>{error}</span><button onClick={load}>Tentar novamente</button></div>}
      {loading ? <div className="admin-loading">Carregando clientes…</div> : filtered.length === 0 ? <div className="admin-empty"><strong>Nenhum cliente encontrado.</strong><span>Tente buscar somente parte do nome ou os números do telefone.</span></div> : (
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Cliente</th><th>Benefícios</th><th>Compras</th><th>Última compra</th><th>Aniversário</th></tr></thead><tbody>{filtered.map((cliente) => <tr key={cliente.id}><td><strong>{cliente.nome || 'Sem nome'}</strong><span>{phone(cliente.telefone)}</span>{cliente.email && <small>{cliente.email}</small>}</td><td><span className="admin-level">{cliente.nivel || 'BRONZE'}</span><small>{Number(cliente.pontos || 0).toLocaleString('pt-BR')} pts · {money(cliente.cashback)} · {Number(cliente.tickets || 0)} tickets</small></td><td><strong>{money(cliente.total_gasto)}</strong><span>{Number(cliente.qtd_pedidos || 0)} pedidos</span></td><td><span>{cliente.ultima_compra ? new Date(cliente.ultima_compra).toLocaleDateString('pt-BR') : 'Ainda não comprou'}</span></td><td>{cliente.aceita_whatsapp_aniversario ? <span className="admin-consent yes">Autorizado</span> : <span className="admin-consent">Não autorizado</span>}{cliente.data_nascimento && <small>{new Date(`${cliente.data_nascimento}T12:00:00`).toLocaleDateString('pt-BR')}</small>}</td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}
