'use client';

import { useEffect, useState } from 'react';
import { fetchAdmin } from '@/lib/adminFetch';

type Operator = { user_id: string; nome: string; email: string; papel: 'superadmin' | 'gestor' | 'caixa'; ativo: boolean; atualizado_em: string };
type Account = { user_id: string; email: string; conta_criada_em: string };

const roleLabel = { superadmin: 'Administração total', gestor: 'Gestão', caixa: 'Caixa' };

export default function OperadoresPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [invite, setInvite] = useState({ nome: '', email: '', papel: 'caixa' as 'gestor' | 'caixa' });
  const [inviting, setInviting] = useState(false);

  async function load() {
    const response = await fetchAdmin('/api/admin/operadores', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível carregar os acessos.');
    setOperators(data.operadores || []); setAccounts(data.semPerfil || []);
  }
  useEffect(() => { load().catch((error) => setNotice(error.message)); }, []);

  async function save(operator: Operator) {
    setSaving(operator.user_id); setNotice('');
    try {
      const response = await fetchAdmin('/api/admin/operadores', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(operator) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar.');
      setNotice(`Acesso de ${operator.nome} atualizado e registrado na auditoria.`); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível salvar.'); }
    finally { setSaving(null); }
  }

  async function remove(operator: Operator) {
    if (operator.papel === 'superadmin') { setNotice('A administração total não pode ser excluída por esta tela.'); return; }
    if (!window.confirm(`Excluir o acesso de ${operator.nome}? Esta ação remove a conta de teste e a permissão. A auditoria será preservada.`)) return;
    setSaving(operator.user_id); setNotice('');
    try {
      const response = await fetchAdmin('/api/admin/operadores', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: operator.user_id, confirmar: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível excluir o acesso.');
      setNotice(data.message); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível excluir o acesso.'); }
    finally { setSaving(null); }
  }

  function update(userId: string, change: Partial<Operator>) { setOperators((current) => current.map((operator) => operator.user_id === userId ? { ...operator, ...change } : operator)); }
  function prepare(account: Account) { setOperators((current) => [...current, { user_id: account.user_id, email: account.email, nome: account.email.split('@')[0], papel: 'caixa', ativo: true, atualizado_em: new Date().toISOString() }]); setAccounts((current) => current.filter((item) => item.user_id !== account.user_id)); }
  async function sendInvite(event: React.FormEvent) {
    event.preventDefault(); setInviting(true); setNotice('');
    try {
      const response = await fetchAdmin('/api/admin/operadores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invite) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Não foi possível enviar o convite.');
      setNotice(data.message); setInvite({ nome: '', email: '', papel: 'caixa' }); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível enviar o convite.'); }
    finally { setInviting(false); }
  }

  return <div className="admin-operators">
    <section className="admin-notice"><strong>Você controla os acessos.</strong><span>Cadastre um funcionário aqui: ele recebe um convite e escolhe a própria senha. Depois, você pode mudar sua função, suspender ou reativar sem apagar o histórico.</span></section>
    {notice && <div className="admin-notice success" role="status"><strong>Status</strong><span>{notice}</span></div>}
    <section className="admin-operator-invite"><div className="admin-section-title"><div><span>Novo funcionário</span><h2>Enviar convite de acesso</h2></div></div><form onSubmit={sendInvite}><label><span>Nome</span><input value={invite.nome} onChange={(event) => setInvite({ ...invite, nome: event.target.value })} required minLength={3} placeholder="Nome da pessoa" /></label><label><span>E-mail de trabalho</span><input type="email" value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} required placeholder="nome@empresa.com" /></label><label><span>Função inicial</span><select value={invite.papel} onChange={(event) => setInvite({ ...invite, papel: event.target.value as 'gestor' | 'caixa' })}><option value="caixa">Caixa — valida cupons</option><option value="gestor">Gestão — operação e relatórios</option></select></label><button disabled={inviting}>{inviting ? 'Enviando…' : 'Enviar convite'}</button></form><small>O convite é registrado na auditoria. Não enviamos senha: cada pessoa cria a sua pelo e-mail.</small></section>
    <section><div className="admin-section-title"><div><span>Permissões</span><h2>Equipe de operação</h2></div></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Pessoa</th><th>Permissão</th><th>Status</th><th /></tr></thead><tbody>
        {operators.map((operator) => <tr key={operator.user_id}><td><strong>{operator.nome}</strong><small>{operator.email}</small></td><td><select value={operator.papel} onChange={(event) => update(operator.user_id, { papel: event.target.value as Operator['papel'] })}>{Object.entries(roleLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td><label className="admin-inline-check"><input type="checkbox" checked={operator.ativo} onChange={(event) => update(operator.user_id, { ativo: event.target.checked })} /> {operator.ativo ? 'Ativo' : 'Suspenso'}</label></td><td><button onClick={() => save(operator)} disabled={saving === operator.user_id}>{saving === operator.user_id ? 'Salvando…' : 'Salvar'}</button>{operator.papel !== 'superadmin' && <button className="admin-danger-button" onClick={() => remove(operator)} disabled={saving === operator.user_id}>Excluir</button>}</td></tr>)}
        {!operators.length && <tr><td colSpan={4}>Ainda não há permissões definidas.</td></tr>}
      </tbody></table></div>
    </section>
    <section><div className="admin-section-title"><div><span>Contas sem função</span><h2>Liberar novo acesso</h2></div></div>
      {accounts.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Conta cadastrada</th><th>Próximo passo</th></tr></thead><tbody>{accounts.map((account) => <tr key={account.user_id}><td><strong>{account.email}</strong></td><td><button onClick={() => prepare(account)}>Definir permissão</button></td></tr>)}</tbody></table></div> : <p className="admin-empty">Nenhuma outra conta cadastrada está aguardando liberação.</p>}
    </section>
  </div>;
}
