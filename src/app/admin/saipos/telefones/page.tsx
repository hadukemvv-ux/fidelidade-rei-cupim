'use client';

import { useState } from 'react';
import { fetchAdmin } from '@/lib/adminFetch';

type Resumo = {
  vendas: number;
  com_telefone_ddd: number;
  sem_telefone_ddd: number;
  telefones_distintos: number;
  telefones_repetidos: number;
  vendas_com_telefone_repetido: number;
  maior_repeticao: number;
};

type Diagnostico = {
  ok?: boolean;
  error?: string;
  status_fornecedor?: number;
  dia?: string;
  geral?: Resumo;
  por_tipo?: Record<string, Resumo>;
};

function hoje() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export default function DiagnosticoTelefonesSaiposPage() {
  const [dia, setDia] = useState(hoje());
  const [dados, setDados] = useState<Diagnostico | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function consultar() {
    setCarregando(true);
    setDados(null);
    try {
      const resposta = await fetchAdmin(`/api/admin/saipos/telefones?dia=${encodeURIComponent(dia)}`, { cache: 'no-store' });
      setDados(await resposta.json());
    } catch {
      setDados({ error: 'Não foi possível consultar a Saipos.' });
    } finally {
      setCarregando(false);
    }
  }

  return <div className="admin-report">
    <section className="admin-notice"><strong>Telefones da Saipos — somente leitura</strong><span>O teste conta telefones completos e repetições por tipo de venda. Nenhum número, nome ou CPF é exibido ou armazenado. Ele não concede pontos nem identifica sozinho a plataforma de origem.</span></section>
    <section className="admin-toolbar">
      <label><span>Data de criação dos pedidos</span><input type="date" value={dia} onChange={(event) => setDia(event.target.value)} /></label>
      <button type="button" onClick={consultar} disabled={carregando}>{carregando ? 'Consultando…' : 'Analisar telefones'}</button>
    </section>
    {dados?.error && <section className="admin-notice error"><strong>Consulta não concluída</strong><span>{dados.error}{dados.status_fornecedor ? ` Código Saipos: ${dados.status_fornecedor}.` : ''}</span></section>}
    {dados?.ok && dados.geral && <>
      <section className="admin-kpi-grid" aria-label="Resumo dos telefones Saipos">
        <article><span>Vendas consultadas</span><strong>{dados.geral.vendas}</strong></article>
        <article><span>Com telefone e DDD</span><strong>{dados.geral.com_telefone_ddd}</strong></article>
        <article><span>Sem telefone e DDD</span><strong>{dados.geral.sem_telefone_ddd}</strong></article>
        <article><span>Maior repetição</span><strong>{dados.geral.maior_repeticao}</strong><small>Compras com o mesmo número no dia; não prova canal</small></article>
      </section>
      <section>
        <div className="admin-section-title"><div><span>Amostra agregada de {dados.dia}</span><h2>Por tipo de venda Saipos</h2></div></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Tipo Saipos</th><th>Vendas</th><th>Com DDD</th><th>Sem DDD</th><th>Números distintos</th><th>Compras com número repetido</th></tr></thead><tbody>
          {Object.entries(dados.por_tipo || {}).map(([tipo, resumo]) => <tr key={tipo}><td>{tipo === '1' ? '1 — entrega' : tipo}</td><td>{resumo.vendas}</td><td>{resumo.com_telefone_ddd}</td><td>{resumo.sem_telefone_ddd}</td><td>{resumo.telefones_distintos}</td><td>{resumo.vendas_com_telefone_repetido}</td></tr>)}
        </tbody></table></div>
      </section>
      <section className="admin-notice"><strong>Como interpretar</strong><span>Telefone ausente ou sem DDD impede o vínculo seguro. Um número presente — mesmo com DDD — não confirma que o pedido veio do canal próprio. Números padrão de integrações e clientes recorrentes podem produzir repetições; precisamos comparar pedidos conhecidos de cada origem antes de automatizar pontos.</span></section>
    </>}
  </div>;
}
