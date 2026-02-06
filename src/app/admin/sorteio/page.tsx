'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// COMPONENTES (❗ caminho relativo para forçar o TS a recarregar tipagem)
import SorteioCard from '../../../components/sorteio/SorteioCard';
import SorteioForm from '../../../components/sorteio/SorteioForm';
import GanhadoresList from '../../../components/sorteio/GanhadoresList';

export default function SorteioAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rodando, setRodando] = useState(false);

  const [sorteio, setSorteio] = useState<any>(null);
  const [ganhadores, setGanhadores] = useState<any[]>([]);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [dataSorteio, setDataSorteio] = useState('');
  const [modo, setModo] = useState<'manual' | 'automatico'>('manual');

  // ===================== CARREGAMENTO =====================
  useEffect(() => {
    carregarSorteio();
    carregarGanhadores();
  }, []);

  async function carregarSorteio() {
    try {
      const res = await fetch('/api/admin/sorteio');
      const data = await res.json();

      if (data?.sorteio) {
        const s = data.sorteio;
        setSorteio(s);
        setTitulo(s.titulo);
        setDescricao(s.descricao || '');
        setImagemUrl(s.imagem_url || '');
        setDataSorteio(s.data_sorteio?.split('T')[0] || '');
        setModo(s.modo || 'manual');
      }

    } finally {
      setLoading(false);
    }
  }

  async function carregarGanhadores() {
    const res = await fetch('/api/admin/sorteio/ganhadores');
    const data = await res.json();
    setGanhadores(data.ganhadores || []);
  }

  // ===================== SALVAR =====================
  async function salvar() {
    setSaving(true);
    try {
      await fetch('/api/admin/sorteio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sorteio?.id || null,
          titulo,
          descricao,
          imagem_url: imagemUrl,
          data_sorteio: dataSorteio,
          modo,
        }),
      });

      await carregarSorteio();

    } finally {
      setSaving(false);
    }
  }

  // ===================== RODAR SORTEIO =====================
  async function rodarSorteioAgora() {
    if (!confirm("Tem certeza que deseja rodar o sorteio agora?")) return;

    setRodando(true);
    try {
      const res = await fetch('/api/admin/sorteio/rodar', { method: 'POST' });
      const data = await res.json();

      alert(`Ganhador: ${data?.ganhador?.nome || 'Desconhecido'}`);

      await carregarGanhadores();
      await carregarSorteio();

    } finally {
      setRodando(false);
    }
  }

  // ===================== LOADING =====================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-[#c5a059] flex items-center justify-center">
        Carregando Sorteio...
      </div>
    );
  }

  // ===================== PÁGINA =====================
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-10 font-sans">

      {/* HEADER */}
      <header className="mb-10 flex justify-between items-center border-b border-gray-700 pb-4">
        <div>
          <h1 className="text-3xl font-black text-[#c5a059] uppercase tracking-wider">
            🎁 Controle de Sorteios
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Gerenciar prêmio, data e histórico do sorteio mensal
          </p>
        </div>

        <Link 
          href="/admin"
          className="text-xs font-bold px-4 py-2 bg-gray-800 rounded border border-gray-700 hover:bg-gray-700"
        >
          ⬅ Voltar
        </Link>
      </header>

      {/* CARD DO PRÊMIO ATUAL */}
      <SorteioCard
        titulo={titulo}
        descricao={descricao}
        imagemUrl={imagemUrl}
        dataSorteio={dataSorteio}
        modo={modo}
        rodarAgora={rodarSorteioAgora}
        rodando={rodando}
      />

      {/* FORMULÁRIO */}
      <SorteioForm
        titulo={titulo}
        setTitulo={setTitulo}
        descricao={descricao}
        setDescricao={setDescricao}
        imagemUrl={imagemUrl}
        setImagemUrl={setImagemUrl}
        dataSorteio={dataSorteio}
        setDataSorteio={setDataSorteio}
        modo={modo}
        setModo={setModo}
        salvar={salvar}
        saving={saving}
      />

      {/* LISTA DE GANHADORES */}
      <GanhadoresList ganhadores={ganhadores} />

    </div>
  );
}