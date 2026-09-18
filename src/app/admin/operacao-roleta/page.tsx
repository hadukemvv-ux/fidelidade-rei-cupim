'use client';

import { useEffect, useState } from 'react';
import { fetchAdmin } from '@/lib/adminFetch';

type Relatorio = { data: string; resumo: { total: number; qrs_emitidos: number; compativeis: number; divergentes: number; pendentes: number }; por_nivel: Array<{ nivel: number; quantidade: number }>; operadores: Array<{ nome: string; total: number; qrs_emitidos: number; compativeis: number; divergentes: number; pendentes: number; indice_atencao: number; situacao: string }>; observacao: string };
function hojeSaoPaulo() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }

export default function OperacaoRoletaPage() {
  const [data, setData] = useState(hojeSaoPaulo()); const [relatorio, setRelatorio] = useState<Relatorio | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  async function carregar(dataSelecionada = data) {
    setLoading(true); setError('');
    try { const response = await fetchAdmin(`/api/admin/operacao-roleta?data=${encodeURIComponent(dataSelecionada)}`, { cache: 'no-store' }); const json = await response.json(); if (!response.ok) throw new Error(json.error || 'Não foi possível carregar.'); setRelatorio(json); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { carregar().catch(() => undefined); }, []);
  return <div className="admin-operators"><section className="admin-notice"><strong>Controle diário da roleta</strong><span>Após a conferência da Saipos, veja quais comandas bateram, onde há divergência e qual operação merece revisão. Isto não pune nem bloqueia ninguém automaticamente.</span></section><form className="admin-operator-invite" onSubmit={(event) => { event.preventDefault(); carregar(); }}><label><span>Data operacional</span><input type="date" value={data} onChange={(event) => setData(event.target.value)} /></label><button disabled={loading}>{loading ? 'Atualizando…' : 'Ver relatório'}</button></form>{error && <div className="admin-notice error"><span>{error}</span></div>}{relatorio && <><section className="admin-kpi-grid"><article><span>Comandas</span><strong>{relatorio.resumo.total}</strong><small>Registros do dia</small></article><article><span>QR de teste</span><strong>{relatorio.resumo.qrs_emitidos}</strong><small>Emitidos pela equipe</small></article><article className="accent"><span>Compatíveis</span><strong>{relatorio.resumo.compativeis}</strong><small>Conferidas pela Saipos</small></article><article><span>Divergentes / pendentes</span><strong>{relatorio.resumo.divergentes} / {relatorio.resumo.pendentes}</strong><small>Revisar, sem punição automática</small></article></section><section className="admin-operator-invite"><h2>Faixas da roleta</h2><p>{relatorio.por_nivel.map((item) => `Nível ${item.nivel}: ${item.quantidade}`).join(' · ')}</p></section><section><div className="admin-section-title"><div><span>Equipe</span><h2>Qualidade da operação</h2></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Responsável</th><th>Comandas / QR</th><th>Compatíveis</th><th>Divergentes</th><th>Pendentes</th><th>Sinal</th></tr></thead><tbody>{relatorio.operadores.map((item) => <tr key={item.nome}><td><strong>{item.nome}</strong></td><td>{item.total} / {item.qrs_emitidos}</td><td>{item.compativeis}</td><td>{item.divergentes}</td><td>{item.pendentes}</td><td>{item.situacao} ({item.indice_atencao})</td></tr>)}{!relatorio.operadores.length && <tr><td colSpan={6}>Nenhuma comanda registrada nesta data.</td></tr>}</tbody></table></div></section><small>{relatorio.observacao}</small></>}</div>;
}
