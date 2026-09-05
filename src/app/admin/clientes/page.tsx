'use client';

import { useEffect, useState } from 'react';
import { fetchAdmin } from '@/lib/adminFetch';

type Filter = 'todos' | 'cadastro_seguro' | 'com_compras' | 'aniversario' | 'piloto' | 'teste';
type Cliente = {
  id: number;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  nivel: string | null;
  pontos: number | null;
  cashback: number | null;
  tickets: number | null;
  total_gasto: number | null;
  qtd_pedidos: number | null;
  ultima_compra: string | null;
  data_nascimento: string | null;
  aceita_whatsapp_aniversario: boolean | null;
  conta_segura: boolean;
  no_piloto: boolean;
  registro_teste: boolean;
};
type Summary = { total: number; cadastrosSeguros: number; comCompras: number; aniversario: number; registrosTeste: number; piloto: number };
type Payload = { pagina: number; porPagina: number; total: number; totalPaginas: number; clientes: Cliente[]; resumo: Summary };

const emptyPayload: Payload = { pagina: 1, porPagina: 20, total: 0, totalPaginas: 0, clientes: [], resumo: { total: 0, cadastrosSeguros: 0, comCompras: 0, aniversario: 0, registrosTeste: 0, piloto: 0 } };

export default function ClientesPage() {
  const [data, setData] = useState<Payload>(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => { load(); }, [page, filter, debouncedSearch]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), page_size: '20', status: filter });
      if (debouncedSearch) params.set('q', debouncedSearch);
      const response = await fetchAdmin(`/api/admin/clientes?${params}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json?.ok) throw new Error(json?.error || 'Não foi possível carregar os clientes.');
      setData(json.data || emptyPayload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os clientes.');
    } finally {
      setLoading(false);
    }
  }

  async function togglePilot(customer: Cliente) {
    setUpdatingId(customer.id);
    setError('');
    try {
      const response = await fetchAdmin('/api/admin/clientes/piloto', {
        method: customer.no_piloto ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: customer.id }),
      });
      const json = await response.json();
      if (!response.ok || !json?.ok) throw new Error(json?.error || 'Não foi possível atualizar o piloto.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o piloto.');
    } finally {
      setUpdatingId(null);
    }
  }

  function changeFilter(value: Filter) {
    setFilter(value);
    setPage(1);
  }

  return (
    <div className="admin-clients">
      <section className="admin-client-summary" aria-label="Resumo da base de clientes">
        <SummaryCard label="Base Saipos" value={data.resumo.total} note="Clientes preservados" />
        <SummaryCard label="Cadastros seguros" value={data.resumo.cadastrosSeguros} note="PIN no formato atual" />
        <SummaryCard label="Piloto" value={`${data.resumo.piloto}/10`} note="Convidados selecionados" accent />
        <SummaryCard label="Dados fictícios" value={data.resumo.registrosTeste} note="Separados para revisão" warning />
      </section>

      <section className="admin-client-controls" aria-label="Pesquisa e filtros">
        <label className="admin-client-search">
          <span>Buscar em todos os clientes</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, telefone ou e-mail" inputMode="search" />
        </label>
        <label>
          <span>Mostrar</span>
          <select value={filter} onChange={(event) => changeFilter(event.target.value as Filter)}>
            <option value="todos">Todos os clientes</option>
            <option value="cadastro_seguro">Cadastros seguros</option>
            <option value="com_compras">Com compras</option>
            <option value="aniversario">Autorizaram aniversário</option>
            <option value="piloto">Selecionados para o piloto</option>
            <option value="teste">Dados fictícios</option>
          </select>
        </label>
        <button type="button" onClick={load} disabled={loading}>Atualizar</button>
      </section>

      <div className="admin-client-result-bar">
        <span><strong>{data.total.toLocaleString('pt-BR')}</strong> {data.total === 1 ? 'resultado' : 'resultados'}</span>
        <span>{data.totalPaginas ? `Página ${data.pagina} de ${data.totalPaginas}` : 'Nenhuma página'}</span>
      </div>

      {error && <div className="admin-notice error"><strong>Não foi possível concluir a ação.</strong><span>{error}</span><button onClick={load}>Tentar novamente</button></div>}

      {loading ? <div className="admin-loading">Carregando clientes…</div> : data.clientes.length === 0 ? (
        <div className="admin-empty"><strong>Nenhum cliente encontrado.</strong><span>Altere o filtro ou busque somente parte do nome ou telefone.</span></div>
      ) : (
        <section className="admin-client-list" aria-label="Clientes encontrados">
          {data.clientes.map((customer) => (
            <article key={customer.id} className={customer.no_piloto ? 'is-pilot' : ''}>
              <div className="admin-client-identity">
                <div className="admin-client-avatar" aria-hidden="true">{initials(customer.nome)}</div>
                <div>
                  <h2>{customer.nome || 'Cliente sem nome'}</h2>
                  <p>{phone(customer.telefone)}{customer.email ? ` · ${customer.email}` : ''}</p>
                  <div className="admin-client-tags">
                    <span>{customer.nivel || 'BRONZE'}</span>
                    {customer.conta_segura ? <span className="success">PIN seguro</span> : <span>Cadastro pendente</span>}
                    {customer.no_piloto && <span className="pilot">Piloto</span>}
                    {customer.registro_teste && <span className="warning">Fictício</span>}
                  </div>
                </div>
              </div>

              <dl className="admin-client-values">
                <div><dt>Pontos</dt><dd>{Number(customer.pontos || 0).toLocaleString('pt-BR')}</dd></div>
                <div><dt>Cashback</dt><dd>{money(customer.cashback)}</dd></div>
                <div><dt>Tickets</dt><dd>{Number(customer.tickets || 0).toLocaleString('pt-BR')}</dd></div>
                <div><dt>Compras</dt><dd>{Number(customer.qtd_pedidos || 0).toLocaleString('pt-BR')}</dd></div>
              </dl>

              <div className="admin-client-meta">
                <span><b>Gasto registrado</b>{money(customer.total_gasto)}</span>
                <span><b>Última compra</b>{date(customer.ultima_compra)}</span>
                <span><b>Aniversário</b>{customer.aceita_whatsapp_aniversario ? 'WhatsApp autorizado' : 'Sem autorização'}{customer.data_nascimento ? ` · ${birthday(customer.data_nascimento)}` : ''}</span>
              </div>

              <button
                type="button"
                className={customer.no_piloto ? 'remove' : ''}
                disabled={updatingId === customer.id || (!customer.no_piloto && data.resumo.piloto >= 10) || customer.registro_teste}
                onClick={() => togglePilot(customer)}
                title={customer.registro_teste ? 'Registros fictícios não podem participar do piloto.' : undefined}
              >
                {updatingId === customer.id ? 'Atualizando…' : customer.no_piloto ? 'Remover do piloto' : 'Adicionar ao piloto'}
              </button>
            </article>
          ))}
        </section>
      )}

      {data.totalPaginas > 1 && (
        <nav className="admin-pagination" aria-label="Paginação dos clientes">
          <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading}>← Anterior</button>
          <span>{page} de {data.totalPaginas}</span>
          <button type="button" onClick={() => setPage((value) => Math.min(data.totalPaginas, value + 1))} disabled={page >= data.totalPaginas || loading}>Próxima →</button>
        </nav>
      )}

      <div className="admin-notice"><strong>Esta tela não altera saldos.</strong><span>Adicionar alguém ao piloto apenas marca o convite. O WhatsApp continua desligado e nenhuma mensagem será enviada.</span></div>
    </div>
  );
}

function SummaryCard({ label, value, note, accent, warning }: { label: string; value: number | string; note: string; accent?: boolean; warning?: boolean }) {
  return <article className={accent ? 'accent' : warning ? 'warning' : ''}><span>{label}</span><strong>{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</strong><small>{note}</small></article>;
}

function initials(name: string | null) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || '?'}${parts.length > 1 ? parts.at(-1)?.[0] || '' : ''}`.toUpperCase();
}

function money(value: number | null) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function phone(value: string | null) {
  const digits = String(value || '').replace(/\D/g, '').slice(-11);
  if (digits.length !== 11) return value || 'Sem telefone';
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' }) : 'Ainda não comprou';
}

function birthday(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}
