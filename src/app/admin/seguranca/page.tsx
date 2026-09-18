'use client';

import { FormEvent, useEffect, useState } from 'react';
import { fetchAdmin } from '@/lib/adminFetch';
import { useAdminCanChange } from '../adminAccessContext';

type Incident = {
  id: string;
  status: string;
  severidade: string;
  descricao: string;
  escopo: string | null;
  iniciado_por_email: string | null;
  iniciado_em: string;
  contencao_desativada_em: string | null;
};

type SecurityData = {
  configuracao: { modo_contencao: boolean; incidente_atual_id: string | null; atualizado_em: string };
  incidentes: Incident[];
};

export default function SegurancaPage() {
  const canChange = useAdminCanChange();
  const [data, setData] = useState<SecurityData | null>(null);
  const [descricao, setDescricao] = useState('');
  const [escopo, setEscopo] = useState('');
  const [severidade, setSeveridade] = useState('alto');
  const [confirmacao, setConfirmacao] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetchAdmin('/api/admin/seguranca', { cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Não foi possível carregar a central de segurança.');
    setData(payload);
  }

  useEffect(() => { load().catch((error) => setNotice(error instanceof Error ? error.message : 'Não foi possível carregar a central.')); }, []);

  async function activate(event: FormEvent) {
    event.preventDefault();
    if (confirmacao !== 'CONTER') return setNotice('Digite CONTER para confirmar.');
    setSaving(true); setNotice('');
    try {
      const response = await fetchAdmin('/api/admin/seguranca', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'ativar_contencao', confirmar: 'CONTER', severidade, descricao, escopo: escopo || undefined }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível ativar a contenção.');
      setNotice('Modo de contenção ativado e incidente registrado. Preserve evidências; não apague dados.');
      setConfirmacao(''); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível ativar a contenção.'); }
    finally { setSaving(false); }
  }

  async function reopen(event: FormEvent) {
    event.preventDefault();
    const incidentId = data?.configuracao.incidente_atual_id;
    if (!incidentId) return;
    if (confirmacao !== 'REABRIR') return setNotice('Digite REABRIR para confirmar.');
    setSaving(true); setNotice('');
    try {
      const response = await fetchAdmin('/api/admin/seguranca', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'desativar_contencao', confirmar: 'REABRIR', incidente_id: incidentId, motivo: descricao }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível reabrir o Clube.');
      setNotice('Contenção desativada. O incidente permanece em investigação e a decisão foi registrada.');
      setConfirmacao(''); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível reabrir o Clube.'); }
    finally { setSaving(false); }
  }

  const active = Boolean(data?.configuracao.modo_contencao);
  return (
    <div className="space-y-8">
      <section className={`admin-notice ${active ? 'error' : ''}`}>
        <strong>{active ? 'CONTENÇÃO ATIVA' : 'Central de privacidade e incidentes'}</strong>
        <span>{active ? 'Cadastro, OTP, resgates, Roleta V2, cupons e sincronização Saipos devem permanecer bloqueados enquanto a investigação acontece.' : 'Use esta área apenas diante de uma suspeita concreta. Ela interrompe operações sensíveis, preserva dados e registra o incidente.'}</span>
      </section>

      {notice && <div className="admin-notice" role="status"><span>{notice}</span></div>}

      {canChange ? <section className="admin-operator-invite">
        <div className="admin-section-title"><div><span>Resposta rápida</span><h2>{active ? 'Reabrir após verificação' : 'Ativar modo de contenção'}</h2></div></div>
        <form onSubmit={active ? reopen : activate}>
          {!active && <label><span>Severidade</span><select value={severidade} onChange={(event) => setSeveridade(event.target.value)}><option value="suspeita">Suspeita</option><option value="baixo">Baixo</option><option value="moderado">Moderado</option><option value="alto">Alto</option><option value="critico">Crítico</option></select></label>}
          <label><span>{active ? 'Motivo técnico para reabrir' : 'O que aconteceu?'}</span><textarea value={descricao} onChange={(event) => setDescricao(event.target.value)} minLength={10} maxLength={2000} required placeholder={active ? 'Ex.: credencial rotacionada, logs revisados e teste de acesso concluído.' : 'Ex.: acesso administrativo inesperado, possível segredo exposto ou alerta do fornecedor.'} /></label>
          {!active && <label><span>Escopo conhecido, sem dados de clientes</span><textarea value={escopo} onChange={(event) => setEscopo(event.target.value)} maxLength={2000} placeholder="Ex.: painel administrativo e integração Saipos; período aproximado." /></label>}
          <label><span>Digite {active ? 'REABRIR' : 'CONTER'} para confirmar</span><input value={confirmacao} onChange={(event) => setConfirmacao(event.target.value.toUpperCase())} autoComplete="off" required /></label>
          <button className={active ? '' : 'admin-danger-button'} disabled={saving}>{saving ? 'Registrando…' : active ? 'Reabrir o Clube após verificação' : 'Ativar contenção agora'}</button>
        </form>
      </section> : <section className="admin-operator-invite"><strong>Somente consulta</strong><p>Gestão acompanha o estado e o histórico. Ativar ou reabrir a contenção é exclusivo do superadmin.</p></section>}

      <section>
        <div className="admin-section-title"><div><span>Histórico</span><h2>Últimos incidentes</h2></div></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Quando</th><th>Status</th><th>Severidade</th><th>Descrição</th><th>Responsável</th></tr></thead><tbody>{(data?.incidentes || []).map((incident) => <tr key={incident.id}><td>{new Date(incident.iniciado_em).toLocaleString('pt-BR')}</td><td>{incident.status}</td><td>{incident.severidade}</td><td>{incident.descricao}</td><td>{incident.iniciado_por_email || '—'}</td></tr>)}{!data?.incidentes.length && <tr><td colSpan={5}>Nenhum incidente registrado.</td></tr>}</tbody></table></div>
      </section>
    </div>
  );
}
