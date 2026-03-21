'use client';

import { fetchAdmin } from '@/lib/adminFetch';
import { useEffect, useState } from 'react';

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

  // ===================== INICIALIZAÇÃO =====================
  useEffect(() => {
    async function init() {
      await Promise.all([carregarSorteio(), carregarGanhadores()]);
      setLoading(false);
    }
    init();
  }, []);

  // ===================== CARREGAR SORTEIO =====================
  async function carregarSorteio() {
    try {
      const res = await fetchAdmin('/api/admin/sorteio');
      const data = await res.json();
      const payload = data?.data ?? data;

      if (!payload?.sorteio) {
        setSorteio(null);
        setTitulo('');
        setDescricao('');
        setImagemUrl('');
        setDataSorteio('');
        setModo('manual');
        return;
      }

      const s = payload.sorteio ?? {};

      setSorteio(s);
      setTitulo(s.titulo ?? '');
      setDescricao(s.descricao ?? '');
      setImagemUrl(s.imagem_url ?? '');
      setDataSorteio(s.data_sorteio ? s.data_sorteio.split('T')[0] : '');
      setModo(s.modo ?? 'manual');

    } catch (error) {
      console.error('Erro ao carregar sorteio:', error);
    }
  }

  // ===================== CARREGAR GANHADORES =====================
  async function carregarGanhadores() {
    try {
      const res = await fetchAdmin('/api/admin/sorteio/ganhadores');
      const data = await res.json();
      const payload = data?.data ?? data;
      setGanhadores(payload?.ganhadores || []);
    } catch (error) {
      console.error('Erro ao carregar ganhadores:', error);
    }
  }

  // ===================== SALVAR SORTEIO =====================
  async function salvar() {
    setSaving(true);

    try {
      const body = {
        id: sorteio?.id ?? null,
        titulo,
        descricao,
        imagem_url: imagemUrl,
        data_sorteio: dataSorteio,
        modo
      };

      const res = await fetchAdmin('/api/admin/sorteio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        console.error("Erro ao salvar sorteio:", await res.text());
      }

      await carregarSorteio();

    } catch (error) {
      console.error("Erro ao salvar sorteio:", error);
    } finally {
      setSaving(false);
    }
  }

  // ===================== RODAR SORTEIO =====================
  async function rodarSorteioAgora() {
    if (!confirm("Tem certeza que deseja rodar o sorteio agora?")) return;

    setRodando(true);

    try {
      const res = await fetchAdmin('/api/admin/sorteio/rodar', { method: 'POST' });
      const data = await res.json();
      const payload = data?.data ?? data;

      console.log('Resultado sorteio:', payload);

      if (!res.ok || data?.error || payload?.error) {
        alert(`⚠️ Erro ao rodar sorteio: ${data?.error || payload?.error || 'Erro desconhecido'}`);
      }

      if (payload?.ganhador) {
        alert(
          `🎉 Ganhador: ${payload.ganhador.nome}\n` +
          `Telefone: ${payload.ganhador.telefone}\n` +
          `Tickets: ${payload.ganhador.tickets}\n\n` +
          `O sorteio foi concluído com sucesso!`
        );
      } else {
        alert("⚠️ Sorteio concluído, mas não foi possível identificar o ganhador.");
      }

      await carregarGanhadores();
      await carregarSorteio();

    } catch (error) {
      console.error('Erro ao rodar sorteio:', error);
      alert('Erro ao rodar sorteio.');
    } finally {
      setRodando(false);
    }
  }

  // ===================== LOADING =====================
  if (loading) {
    return <p className="text-[#c5a059]">Carregando sorteio...</p>;
  }

  // ===================== PÁGINA =====================
  return (
    <div className="space-y-10">

      <div>
        <h1 className="text-3xl font-black text-[#c5a059]">Controle de Sorteios</h1>
        <p className="text-gray-400">Gerencie prêmio, data e histórico do sorteio.</p>
      </div>

      <SorteioCard
        titulo={titulo}
        descricao={descricao}
        imagemUrl={imagemUrl}
        dataSorteio={dataSorteio}
        modo={modo}
        rodarAgora={rodarSorteioAgora}
        rodando={rodando}
      />

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

      <GanhadoresList ganhadores={ganhadores} />

    </div>
  );
}