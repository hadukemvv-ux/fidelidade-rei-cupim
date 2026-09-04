'use client';
import { fetchAdmin } from '@/lib/adminFetch';
import { useState, useEffect } from 'react';

type Produto = {
  id?: number;
  nome?: string;
  descricao?: string;
  imagem_url?: string;
  custo_em_pontos?: number;
  custo_pontos?: number;
  categoria?: string;
  destaque?: boolean;
};

export default function AdminCardapio() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);

  useEffect(() => {
    fetchProdutos();
  }, []);

  async function fetchProdutos() {
    const res = await fetch('/api/produtos');
    const data = await res.json();
    setProdutos(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function toggleDestaque(produto: Produto) {
    const novoStatus = !produto.destaque;

    setProdutos(prev =>
      prev.map(p => p.id === produto.id ? { ...p, destaque: novoStatus } : p)
    );

    try {
      const res = await fetchAdmin('/api/admin/produtos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: produto.id, destaque: novoStatus })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Nao foi possivel atualizar o destaque.');
      }
    } catch (error: unknown) {
      setProdutos(prev =>
        prev.map(p => p.id === produto.id ? { ...p, destaque: produto.destaque } : p)
      );
      alert(error instanceof Error ? error.message : 'Erro ao atualizar destaque.');
    }
  }

  async function salvarProduto(e: React.FormEvent) {
    e.preventDefault();
    if (!produtoEditando) return;
    const isNew = !produtoEditando.id;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const res = await fetchAdmin('/api/admin/produtos', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(produtoEditando)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Nao foi possivel salvar o produto.');
      }

      setModalOpen(false);
      fetchProdutos();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Erro ao salvar produto.');
    }
  }

  return (
    <div className="space-y-12">

      {/* TÍTULO */}
      <div>
        <h1 className="text-3xl font-black text-[#c5a059]">Gestão de Cardápio</h1>
        <p className="text-zinc-400">Controle total dos produtos resgatáveis por pontos.</p>
      </div>

      {/* BOTÃO NOVO PRODUTO */}
      <div className="flex justify-end">
        <button
          onClick={() => { setProdutoEditando({}); setModalOpen(true); }}
          className="bg-[#e31e24] hover:bg-[#c1191f] text-white font-bold px-6 py-2 rounded-lg"
        >
          + Novo Produto
        </button>
      </div>

      {/* GRID DE PRODUTOS */}
      {loading ? (
        <p>Carregando cardápio...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {Array.isArray(produtos) && produtos.map(produto => (
            <div
              key={produto.id}
              className={`bg-zinc-800 rounded-xl overflow-hidden border ${
                produto.destaque
                  ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                  : 'border-zinc-700'
              }`}
            >

              {/* Imagem */}
              <div className="h-40 bg-black/50 relative">
                {produto.imagem_url ? (
                  <img
                    src={produto.imagem_url}
                    alt={produto.nome || 'Produto resgatável'}
                    className="w-full h-full object-cover opacity-80"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    🥘
                  </div>
                )}

                {produto.destaque && (
                  <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
                    EM PROMOÇÃO
                  </div>
                )}
              </div>

              {/* Conteúdo */}
              <div className="p-4">
                <div className="flex justify-between mb-2">
                  <h3 className="font-bold text-lg">{produto.nome}</h3>
                  <span className="text-[#c5a059] font-bold text-sm">
                    {produto.custo_pontos || produto.custo_em_pontos} pts
                  </span>
                </div>

                <p className="text-xs text-zinc-400 mb-4 h-10 overflow-hidden">
                  {produto.descricao}
                </p>

                {/* Controles */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-700">

                  {/* PROMOÇÃO */}
                  <button
                    onClick={() => toggleDestaque(produto)}
                    className="flex items-center gap-2 cursor-pointer select-none bg-transparent border-0"
                    aria-pressed={Boolean(produto.destaque)}
                    aria-label={`${produto.destaque ? 'Remover' : 'Adicionar'} ${produto.nome} dos destaques`}
                  >
                    <div
                      className={`w-10 h-6 rounded-full p-1 transition-colors ${
                        produto.destaque ? 'bg-green-500' : 'bg-zinc-600'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          produto.destaque ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      ></div>
                    </div>
                    <span className="text-xs font-bold">
                      {produto.destaque ? 'Promoção' : 'Normal'}
                    </span>
                  </button>

                  {/* EDITAR */}
                  <button
                    onClick={() => { setProdutoEditando(produto); setModalOpen(true); }}
                    className="text-sm bg-zinc-700 hover:bg-zinc-600 px-3 py-1 rounded transition-colors"
                  >
                    ✏️ Editar
                  </button>

                </div>
              </div>
            </div>
          ))}

        </div>
      )}

      {/* MODAL */}
      {modalOpen && produtoEditando && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-800 p-6 rounded-xl w-full max-w-lg border border-zinc-700">

            <h2 className="text-xl font-bold text-[#c5a059] mb-4">
              {produtoEditando.id ? 'Editar Produto' : 'Novo Produto'}
            </h2>

            <form onSubmit={salvarProduto} className="space-y-4">

              <div>
                <label className="block text-xs uppercase text-zinc-500 mb-1">Nome</label>
                <input
                  value={produtoEditando.nome || ''}
                  onChange={e => setProdutoEditando({ ...produtoEditando, nome: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-zinc-500 mb-1">Descrição</label>
                <textarea
                  value={produtoEditando.descricao || ''}
                  onChange={e => setProdutoEditando({ ...produtoEditando, descricao: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white h-20"
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-zinc-500 mb-1">Custo em Pontos</label>
                <input
                  type="number"
                  value={produtoEditando.custo_em_pontos || produtoEditando.custo_pontos || ''}
                  onChange={e =>
                    setProdutoEditando({
                      ...produtoEditando,
                      custo_em_pontos: Number(e.target.value)
                    })
                  }
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-zinc-500 mb-1">Categoria</label>
                <select
                  value={produtoEditando.categoria || 'geral'}
                  onChange={e => setProdutoEditando({ ...produtoEditando, categoria: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white"
                >
                  <option value="prato">Prato</option>
                  <option value="bebida">Bebida</option>
                  <option value="sobremesa">Sobremesa</option>
                  <option value="acompanhamento">Acompanhamento</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase text-zinc-500 mb-1">Imagem</label>
                <input
                  value={produtoEditando.imagem_url || ''}
                  onChange={e => setProdutoEditando({ ...produtoEditando, imagem_url: e.target.value })}
                  placeholder="/produtos/file.png"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="flex-1 bg-[#e31e24] font-bold rounded py-3 hover:bg-[#c1191f]"
                >
                  Salvar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
