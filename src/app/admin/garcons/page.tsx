'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminGarconsPage() {
  const [garcons, setGarcons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
    const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN;

    const withAdminToken = (url: string) => {
        if (!adminToken) return url;
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}token=${encodeURIComponent(adminToken)}`;
    };
  
  // Estados para Edição/Criação
  const [editando, setEditando] = useState<any>(null);
  const [modalAberto, setModalAberto] = useState(false);

  // Campos do Formulário
  const [formNome, setFormNome] = useState('');
  const [formCodigo, setFormCodigo] = useState('');

  useEffect(() => {
    carregarGarcons();
  }, []);

  async function carregarGarcons() {
    try {
        const res = await fetch(withAdminToken('/api/admin/garcons'));
        if (res.ok) {
            const data = await res.json();
            const payload = data?.data ?? data;
            setGarcons(payload?.garcons || payload || []);
        }
    } catch (e) {
        console.error("Erro ao carregar:", e);
    } finally {
        setLoading(false);
    }
  }

  function abrirModal(garcom?: any) {
      if (garcom) {
          setEditando(garcom);
          setFormNome(garcom.nome);
          setFormCodigo(garcom.codigo_prefixo);
      } else {
          setEditando(null);
          setFormNome('');
          setFormCodigo('');
      }
      setModalAberto(true);
  }

  async function salvarGarcom() {
      if (!formNome || !formCodigo) return alert('Preencha nome e código!');
      
      const payload = { nome: formNome, codigo_prefixo: formCodigo };
      const metodo = editando ? 'PUT' : 'POST';
      const url = editando ? `/api/admin/garcons?id=${editando.id}` : '/api/admin/garcons';

      try {
          const res = await fetch(withAdminToken(url), {
              method: metodo,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          
          const data = await res.json();

          if (!res.ok) {
              throw new Error(data.error || 'Erro desconhecido ao salvar.');
          }

          setModalAberto(false);
          carregarGarcons();
          alert('Sucesso! Garçom salvo. ✅');
      } catch (e: any) {
          console.error(e);
          alert(`ERRO: ${e.message}`);
      }
  }

  async function resetarRanking() {
      if (!confirm('Tem certeza? Isso vai ZERAR o contador de giros de TODOS os garçons.')) return;
      
      try {
          await fetch(withAdminToken('/api/admin/garcons/reset'), { method: 'POST' });
          alert('Ranking resetado com sucesso! 🏁');
          carregarGarcons();
      } catch (e) {
          alert('Erro ao resetar.');
      }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-8">
      {/* HEADER */}
      <div className="max-w-5xl mx-auto flex justify-between items-center mb-10">
        <div>
            <h1 className="text-3xl font-black text-[#c5a059] uppercase tracking-wider">Gestão de Garçons</h1>
            <p className="text-gray-400 text-sm">Controle sua equipe e veja o ranking de desempenho.</p>
        </div>
        <div className="flex gap-4">
            <button onClick={resetarRanking} className="px-4 py-2 border border-red-500 text-red-400 rounded hover:bg-red-900/30 text-xs font-bold uppercase transition-colors">
                🗑️ Zerar Ranking
            </button>
            <Link href="/admin" className="px-6 py-3 bg-gray-800 rounded-lg font-bold hover:bg-gray-700">
                Voltar
            </Link>
            <button onClick={() => abrirModal()} className="px-6 py-3 bg-[#c5a059] text-black rounded-lg font-bold hover:brightness-110 shadow-lg shadow-[#c5a059]/20">
                + Novo Garçom
            </button>
        </div>
      </div>

      {/* LISTA / RANKING */}
      <div className="max-w-5xl mx-auto grid gap-4">
          {loading ? (
              <p className="text-center text-gray-500 animate-pulse">Carregando equipe...</p>
          ) : garcons.map((g, index) => (
              <div key={g.id} className="bg-gray-800 border border-gray-700 p-6 rounded-xl flex items-center justify-between hover:border-[#c5a059] transition-colors group">
                  
                  <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl border-2 ${
                          index === 0 ? 'bg-[#c5a059] text-black border-[#c5a059]' :
                          index === 1 ? 'bg-gray-400 text-black border-gray-400' :
                          index === 2 ? 'bg-[#cd7f32] text-black border-[#cd7f32]' :
                          'bg-gray-700 text-gray-400 border-gray-600'
                      }`}>
                          #{index + 1}
                      </div>

                      <div>
                          <h3 className="text-xl font-bold text-white group-hover:text-[#c5a059] transition-colors">{g.nome}</h3>
                          <div className="flex items-center gap-3 mt-1">
                              <span className="bg-black/30 px-2 py-1 rounded text-xs font-mono text-gray-400 border border-gray-600">
                                  Código Base: <strong className="text-white">{g.codigo_prefixo}</strong>
                              </span>
                              <span className="text-xs text-gray-500">
                                  Senhas: {g.codigo_prefixo}01, {g.codigo_prefixo}02, {g.codigo_prefixo}03
                              </span>
                          </div>
                      </div>
                  </div>

                  <div className="flex items-center gap-8">
                      <div className="text-right">
                          <p className="text-3xl font-black text-white">{g.total_giros || 0}</p>
                          <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">Giros na Roleta</p>
                      </div>

                      {/* 🔥 LINK AJUSTADO PARA O PERFIL DO GARÇOM */}
                      <Link
                        href={`/admin/garcons/${g.id}`}
                        className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-[#c5a059] hover:text-black transition-all text-sm font-bold"
                      >
                        Ver Perfil
                      </Link>

                      <button onClick={() => abrirModal(g)} className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center hover:bg-[#c5a059] hover:text-black transition-all">
                          ✏️
                      </button>
                  </div>
              </div>
          ))}
      </div>

      {/* MODAL */}
      {modalAberto && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
              <div className="bg-gray-900 border border-[#c5a059] p-8 rounded-2xl w-full max-w-md shadow-2xl">
                  <h2 className="text-2xl font-bold text-white mb-6">{editando ? 'Editar Garçom' : 'Cadastrar Novo'}</h2>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-[#c5a059] mb-1">NOME</label>
                          <input value={formNome} onChange={e => setFormNome(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-[#c5a059] outline-none" placeholder="Ex: João Silva" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-[#c5a059] mb-1">CÓDIGO PREFIXO (2 Dígitos)</label>
                          <input value={formCodigo} onChange={e => setFormCodigo(e.target.value.replace(/\D/g, '').slice(0, 2))} className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-[#c5a059] outline-none text-center text-xl tracking-widest" placeholder="Ex: 10" />
                          <p className="text-xs text-gray-500 mt-2">Esse garçom usará as senhas: {formCodigo || 'XX'}01, {formCodigo || 'XX'}02, {formCodigo || 'XX'}03.</p>
                      </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                      <button onClick={() => setModalAberto(false)} className="flex-1 py-3 bg-gray-800 rounded font-bold hover:bg-gray-700">Cancelar</button>
                      <button onClick={salvarGarcom} className="flex-1 py-3 bg-[#c5a059] text-black rounded font-bold hover:brightness-110">Salvar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}