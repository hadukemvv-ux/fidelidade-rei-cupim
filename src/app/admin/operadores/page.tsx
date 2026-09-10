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

  function update(userId: string, change: Partial<Operator>) { setOperators((current) => current.map((operator) => operator.user_id === userId ? { ...operator, ...change } : operator)); }
  function prepare(account: Account) { setOperators((current) => [...current, { user_id: account.user_id, email: account.email, nome: account.email.split('@')[0], papel: 'caixa', ativo: true, atualizado_em: new Date().toISOString() }]); setAccounts((current) => current.filter((item) => item.user_id !== account.user_id)); }

  return <div className="admin-operators">
    <section className="admin-notice"><strong>Você controla os acessos.</strong><span>Uma pessoa precisa primeiro criar uma conta no site. Depois, nesta página, você escolhe se ela é caixa, gestão ou administração total. Suspender o acesso não apaga o histórico.</span></section>
    {notice && <div className="admin-notice success" role="status"><strong>Status</strong><span>{notice}</span></div>}
    <section><div className="admin-section-title"><div><span>Permissões</span><h2>Equipe de operação</h2></div></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Pessoa</th><th>Permissão</th><th>Status</th><th /></tr></thead><tbody>
        {operators.map((operator) => <tr key={operator.user_id}><td><strong>{operator.nome}</strong><small>{operator.email}</small></td><td><select value={operator.papel} onChange={(event) => update(operator.user_id, { papel: event.target.value as Operator['papel'] })}>{Object.entries(roleLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td><label className="admin-inline-check"><input type="checkbox" checked={operator.ativo} onChange={(event) => update(operator.user_id, { ativo: event.target.checked })} /> {operator.ativo ? 'Ativo' : 'Suspenso'}</label></td><td><button onClick={() => save(operator)} disabled={saving === operator.user_id}>{saving === operator.user_id ? 'Salvando…' : 'Salvar'}</button></td></tr>)}
        {!operators.length && <tr><td colSpan={4}>Ainda não há permissões definidas.</td></tr>}
      </tbody></table></div>
    </section>
    <section><div className="admin-section-title"><div><span>Contas sem função</span><h2>Liberar novo acesso</h2></div></div>
      {accounts.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Conta cadastrada</th><th>Próximo passo</th></tr></thead><tbody>{accounts.map((account) => <tr key={account.user_id}><td><strong>{account.email}</strong></td><td><button onClick={() => prepare(account)}>Definir permissão</button></td></tr>)}</tbody></table></div> : <p className="admin-empty">Nenhuma outra conta cadastrada está aguardando liberação.</p>}
    </section>
  </div>;
}
