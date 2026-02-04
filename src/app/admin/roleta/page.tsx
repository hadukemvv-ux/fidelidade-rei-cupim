'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminRoletaPage() {
  const [premios, setPremios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const res = await fetch('/api/admin/premios');
    const data = await res.json();
    setPremios(data);
    setLoading(false);
  }

  async function salvarItem(item: any) {
    try {
        await fetch('/api/admin/premios', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        alert('Item atualizado com sucesso!');
    } catch (e) { alert('Erro ao salvar.'); }
  }

  const handleChange = (index: number, field: string, value: any) => {
      const novos = [...premios];
      novos[index] = { ...novos[index], [field]: value };
      setPremios(novos);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black text-[#c5a059]">⚙️ Configurar Roleta</h1>
            <Link href="/admin" className="bg-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-700">Voltar</Link>
        </div>

        <div className="grid gap-6">
            {loading ? <p className="text-center animate-pulse">Carregando prêmios...</p> : premios.map((p, i) => (
                <div key={p.id} className="bg-gray-800 p-6 rounded-2xl flex flex-col gap-4 border border-gray-700 shadow-xl hover:border-[#c5a059]/50 transition-colors">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 border-b border-gray-700 pb-4">
                        <div className="w-12 h-12 flex items-center justify-center text-3xl bg-black rounded-xl shadow-inner shrink-0">
                            {p.emoji}
                        </div>
                        
                        {/* CAMPO NOME DO PRODUTO (O QUE FALTAVA!) */}
                        <div className="flex-1 w-full">
                            <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1 block">Nome do Prêmio (Exibe na Roda)</label>
                            <input 
                                value={p.nome} 
                                onChange={e => handleChange(i, 'nome', e.target.value)} 
                                className="w-full bg-black/30 border border-gray-600 rounded-lg p-2 text-lg font-bold text-white focus:border-[#c5a059] outline-none"
                            />
                        </div>

                        <div className="shrink-0 w-full md:w-auto">
                             <button onClick={() => salvarItem(p)} className="w-full md:w-auto bg-[#c5a059] text-black font-black px-8 py-3 rounded-xl hover:scale-105 transition-transform shadow-lg">SALVAR</button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <div className="md:col-span-2 lg:col-span-2">
                            <label className="text-[10px] text-[#c5a059] font-black uppercase tracking-widest mb-1 block">Frase de Vitória (Subtítulo do Modal)</label>
                            <input 
                                value={p.descricao_vitoria || ''} 
                                onChange={e => handleChange(i, 'descricao_vitoria', e.target.value)} 
                                placeholder="Ex: Ganhou 1 Cerveja Gelada! 🍺"
                                className="w-full bg-black/50 border border-gray-600 rounded-xl p-3 text-sm focus:border-[#c5a059] outline-none" 
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Emoji</label>
                            <input value={p.emoji} onChange={e => handleChange(i, 'emoji', e.target.value)} className="w-full bg-black/30 border border-gray-600 rounded-xl p-3 text-sm text-center" />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Probabilidade</label>
                            <input type="number" value={p.probabilidade} onChange={e => handleChange(i, 'probabilidade', parseInt(e.target.value))} className="w-full bg-black/30 border border-gray-600 rounded-xl p-3 text-sm" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}