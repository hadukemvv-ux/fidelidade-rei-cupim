'use client';
/* eslint-disable @next/next/no-img-element -- Admin previews may use user-configured external URLs. */

import { useEffect, useMemo, useState } from 'react';
import { fetchAdmin } from '@/lib/adminFetch';
import { CUSTO_ENTREGA_GRATIS_PONTOS, INTERVALO_ENTREGA_GRATIS_DIAS } from '@/lib/fidelidade-rules';

type Produto = { id?: number; nome: string; descricao: string; imagem_url: string; custo_em_pontos: number; categoria: string; destaque: boolean; ativo: boolean };
type StatusFilter = 'todos' | 'ativos' | 'pausados' | 'ofertas';

const emptyProduct: Produto = { nome: '', descricao: '', imagem_url: '', custo_em_pontos: 0, categoria: 'prato', destaque: false, ativo: false };
const categoryLabels: Record<string, string> = { prato: 'Prato', bebida: 'Bebida', sobremesa: 'Sobremesa', acompanhamento: 'Acompanhamento', beneficio: 'Benefício', geral: 'Geral' };

export default function AdminCardapio() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('todos');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      const response = await fetchAdmin('/api/admin/produtos', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json?.ok) throw new Error(json?.error || 'Não foi possível carregar as recompensas.');
      setProdutos((json.data?.produtos || []).map(normalizeProduct));
    } catch (cause) {
      setNotice({ type: 'error', text: cause instanceof Error ? cause.message : 'Não foi possível carregar as recompensas.' });
    } finally { setLoading(false); }
  }

  const summary = useMemo(() => ({
    total: produtos.length,
    active: produtos.filter((item) => item.ativo).length,
    paused: produtos.filter((item) => !item.ativo).length,
    offers: produtos.filter((item) => item.ativo && item.destaque).length,
  }), [produtos]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    return produtos.filter((item) => {
      if (filter === 'ativos' && !item.ativo) return false;
      if (filter === 'pausados' && item.ativo) return false;
      if (filter === 'ofertas' && (!item.ativo || !item.destaque)) return false;
      return !query || `${item.nome} ${item.descricao} ${item.categoria}`.toLocaleLowerCase('pt-BR').includes(query);
    });
  }, [produtos, search, filter]);

  async function updateProduct(product: Produto, updates: Partial<Produto>, successText: string) {
    if (!product.id) return;
    setUpdatingId(product.id);
    setNotice(null);
    try {
      const response = await fetchAdmin('/api/admin/produtos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: product.id, ...updates }) });
      const json = await response.json();
      if (!response.ok || !json?.ok) throw new Error(json?.error || 'Não foi possível atualizar a recompensa.');
      setProdutos((current) => current.map((item) => item.id === product.id ? { ...item, ...json.data.produto } : item));
      setNotice({ type: 'success', text: successText });
    } catch (cause) {
      setNotice({ type: 'error', text: cause instanceof Error ? cause.message : 'Não foi possível atualizar a recompensa.' });
    } finally { setUpdatingId(null); }
  }

  function toggleActive(product: Produto) {
    const next = !product.ativo;
    const message = next ? `Publicar “${product.nome}” agora? Ela aparecerá imediatamente para os clientes.` : `Pausar “${product.nome}”? Ela deixará de aparecer para os clientes, mas não será apagada.`;
    if (!window.confirm(message)) return;
    updateProduct(product, { ativo: next }, next ? 'Recompensa publicada.' : 'Recompensa pausada.');
  }

  function toggleOffer(product: Produto) {
    const next = !product.destaque;
    const discounted = Math.floor(Number(product.custo_em_pontos || 0) * .5);
    const message = next ? `Ativar oferta de 50% em “${product.nome}”? O cliente passará a pagar ${points(discounted)} enquanto a oferta estiver ativa.` : `Encerrar a oferta de “${product.nome}”? O preço voltará para ${points(product.custo_em_pontos)}.`;
    if (!window.confirm(message)) return;
    updateProduct(product, { destaque: next }, next ? 'Oferta de 50% ativada.' : 'Oferta encerrada.');
  }

  async function saveProduct(event: React.FormEvent) {
    event.preventDefault();
    if (!produtoEditando) return;
    setSaving(true);
    setNotice(null);
    try {
      const isNew = !produtoEditando.id;
      const response = await fetchAdmin('/api/admin/produtos', { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(produtoEditando) });
      const json = await response.json();
      if (!response.ok || !json?.ok) throw new Error(json?.error || 'Não foi possível salvar a recompensa.');
      setModalOpen(false);
      setProdutoEditando(null);
      setNotice({ type: 'success', text: isNew ? 'Recompensa criada como rascunho.' : 'Recompensa atualizada.' });
      await loadProducts();
    } catch (cause) {
      setNotice({ type: 'error', text: cause instanceof Error ? cause.message : 'Não foi possível salvar a recompensa.' });
    } finally { setSaving(false); }
  }

  return <div className="admin-rewards">
    <section className="admin-client-summary" aria-label="Resumo das recompensas">
      <Summary label="Catálogo" value={summary.total} note="Sem exclusões automáticas" />
      <Summary label="Publicadas" value={summary.active} note="Visíveis para clientes" accent />
      <Summary label="Pausadas" value={summary.paused} note="Guardadas para depois" />
      <Summary label="Ofertas 50%" value={summary.offers} note="Ativas neste momento" warning />
    </section>

    <section className="admin-delivery-rule">
      <div><span>Benefício fixo de entrada</span><h2>Taxa de entrega grátis</h2><p>O bônus do cadastro paga a primeira entrega. Depois, cada cliente só pode repetir o benefício quando completar o intervalo.</p></div>
      <dl><div><dt>Custo</dt><dd>{points(CUSTO_ENTREGA_GRATIS_PONTOS)}</dd></div><div><dt>Intervalo</dt><dd>{INTERVALO_ENTREGA_GRATIS_DIAS} dias</dd></div></dl>
      <small>Esta regra está protegida no sistema e não é alterada ao editar os produtos abaixo.</small>
    </section>

    {notice && <div className={`admin-notice ${notice.type === 'error' ? 'error' : 'success'}`} role="status"><strong>{notice.type === 'error' ? 'Ação não concluída' : 'Tudo certo'}</strong><span>{notice.text}</span></div>}

    <section className="admin-reward-controls" aria-label="Pesquisa e filtros">
      <label><span>Buscar recompensa</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, descrição ou categoria" /></label>
      <label><span>Mostrar</span><select value={filter} onChange={(event) => setFilter(event.target.value as StatusFilter)}><option value="todos">Todo o catálogo</option><option value="ativos">Somente publicadas</option><option value="pausados">Somente pausadas</option><option value="ofertas">Ofertas de 50%</option></select></label>
      <button type="button" onClick={() => { setProdutoEditando({ ...emptyProduct }); setModalOpen(true); }}>+ Nova recompensa</button>
    </section>

    <div className="admin-client-result-bar"><span><strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'recompensa encontrada' : 'recompensas encontradas'}</span><span>Novas recompensas começam pausadas</span></div>

    {loading ? <div className="admin-loading">Carregando recompensas…</div> : filteredProducts.length === 0 ? <div className="admin-empty"><strong>Nenhuma recompensa encontrada.</strong><span>Altere o filtro ou procure por outro termo.</span></div> : <section className="admin-reward-list" aria-label="Catálogo de recompensas">
      {filteredProducts.map((product) => {
        const normalCost = Number(product.custo_em_pontos || 0);
        const customerCost = product.destaque ? Math.floor(normalCost * .5) : normalCost;
        const busy = updatingId === product.id;
        return <article key={product.id} className={!product.ativo ? 'is-paused' : ''}>
          <div className="admin-reward-image">{product.imagem_url ? <img src={product.imagem_url} alt="" /* Admin preview may use user-configured external URLs. */ /> : <span aria-hidden="true">★</span>}</div>
          <div className="admin-reward-copy"><div className="admin-reward-tags"><span>{categoryLabels[product.categoria] || product.categoria || 'Geral'}</span><span className={product.ativo ? 'published' : 'paused'}>{product.ativo ? 'Publicada' : 'Pausada'}</span>{product.destaque && <span className="offer">Oferta 50%</span>}</div><h2>{product.nome || 'Sem nome'}</h2><p>{product.descricao || 'Sem descrição.'}</p></div>
          <dl className="admin-reward-cost"><div><dt>Preço normal</dt><dd>{points(normalCost)}</dd></div><div className={product.destaque ? 'offer' : ''}><dt>Cliente paga</dt><dd>{points(customerCost)}</dd></div></dl>
          <div className="admin-reward-actions"><button type="button" className="secondary" onClick={() => { setProdutoEditando({ ...product }); setModalOpen(true); }} disabled={busy}>Editar</button><button type="button" className={product.destaque ? 'secondary' : ''} onClick={() => toggleOffer(product)} disabled={busy}>{busy ? 'Salvando…' : product.destaque ? 'Encerrar 50%' : 'Ativar 50%'}</button><button type="button" className={product.ativo ? 'pause' : 'publish'} onClick={() => toggleActive(product)} disabled={busy}>{busy ? 'Salvando…' : product.ativo ? 'Pausar' : 'Publicar'}</button></div>
        </article>;
      })}
    </section>}

    <div className="admin-notice"><strong>Nada é apagado nesta tela.</strong><span>“Pausar” apenas esconde a recompensa dos clientes. “Oferta 50%” reduz pela metade o custo cobrado no site e no servidor.</span></div>

    {modalOpen && produtoEditando && <div className="admin-reward-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModalOpen(false); }}><section className="admin-reward-modal" role="dialog" aria-modal="true" aria-labelledby="reward-dialog-title">
      <header><div><span>{produtoEditando.id ? 'Editar catálogo' : 'Nova recompensa'}</span><h2 id="reward-dialog-title">{produtoEditando.id ? produtoEditando.nome : 'Criar recompensa'}</h2></div><button type="button" onClick={() => setModalOpen(false)} disabled={saving} aria-label="Fechar">×</button></header>
      <form onSubmit={saveProduct}>
        <div className="admin-reward-form-grid">
          <label className="wide"><span>Nome</span><input value={produtoEditando.nome} onChange={(event) => setProdutoEditando({ ...produtoEditando, nome: event.target.value })} required maxLength={255} /></label>
          <label className="wide"><span>Descrição curta</span><textarea value={produtoEditando.descricao} onChange={(event) => setProdutoEditando({ ...produtoEditando, descricao: event.target.value })} maxLength={1000} rows={3} /></label>
          <label><span>Preço normal em pontos</span><input type="number" min="1" step="1" value={produtoEditando.custo_em_pontos || ''} onChange={(event) => setProdutoEditando({ ...produtoEditando, custo_em_pontos: Number(event.target.value) })} required /></label>
          <label><span>Categoria</span><select value={produtoEditando.categoria} onChange={(event) => setProdutoEditando({ ...produtoEditando, categoria: event.target.value })}><option value="prato">Prato</option><option value="bebida">Bebida</option><option value="sobremesa">Sobremesa</option><option value="acompanhamento">Acompanhamento</option><option value="beneficio">Benefício</option><option value="geral">Geral</option></select></label>
          <label className="wide"><span>Imagem</span><input value={produtoEditando.imagem_url} onChange={(event) => setProdutoEditando({ ...produtoEditando, imagem_url: event.target.value })} placeholder="/produtos/foto.jpg ou https://…" maxLength={2048} /><small>Use uma imagem do site ou um endereço público começando com https://.</small></label>
        </div>
        <section className="admin-reward-preview"><div><span>Preço normal</span><strong>{points(produtoEditando.custo_em_pontos)}</strong></div><div className={produtoEditando.destaque ? 'offer' : ''}><span>Cliente pagará</span><strong>{points(produtoEditando.destaque ? Math.floor(produtoEditando.custo_em_pontos * .5) : produtoEditando.custo_em_pontos)}</strong></div></section>
        <div className="admin-reward-switches"><label><input type="checkbox" checked={produtoEditando.destaque} onChange={(event) => setProdutoEditando({ ...produtoEditando, destaque: event.target.checked })} /><span><strong>Oferta de 50%</strong><small>Reduz imediatamente o custo para o cliente quando publicada.</small></span></label><label><input type="checkbox" checked={produtoEditando.ativo} onChange={(event) => setProdutoEditando({ ...produtoEditando, ativo: event.target.checked })} /><span><strong>Publicar para clientes</strong><small>Desmarcado, fica salvo como rascunho.</small></span></label></div>
        <footer><button type="button" className="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button><button type="submit" disabled={saving}>{saving ? 'Salvando…' : produtoEditando.id ? 'Salvar alterações' : produtoEditando.ativo ? 'Criar e publicar' : 'Salvar rascunho'}</button></footer>
      </form>
    </section></div>}
  </div>;
}

function Summary({ label, value, note, accent, warning }: { label: string; value: number; note: string; accent?: boolean; warning?: boolean }) {
  return <article className={accent ? 'accent' : warning ? 'warning' : ''}><span>{label}</span><strong>{value.toLocaleString('pt-BR')}</strong><small>{note}</small></article>;
}

function points(value: number) { return `${Number(value || 0).toLocaleString('pt-BR')} pts`; }

function normalizeProduct(value: Partial<Produto>): Produto {
  return {
    id: value.id,
    nome: value.nome || '',
    descricao: value.descricao || '',
    imagem_url: value.imagem_url || '',
    custo_em_pontos: Number(value.custo_em_pontos || 0),
    categoria: value.categoria || 'geral',
    destaque: Boolean(value.destaque),
    ativo: Boolean(value.ativo),
  };
}
