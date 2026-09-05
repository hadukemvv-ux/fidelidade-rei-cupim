'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchAdmin } from '@/lib/adminFetch';
import { chancesPorNivel, premioReservado, type NivelRoleta, type PremioRoletaRegra } from '@/lib/roleta-rules';

type PremioRoleta = PremioRoletaRegra & {
  emoji: string;
  descricao_vitoria: string;
  valor?: number;
  valor_pontos?: number;
  cor?: string;
};

const levelLabels: Record<NivelRoleta, string> = { 1: 'Bronze', 2: 'Prata', 3: 'Ouro' };

export default function AdminRoletaPage() {
  const [premios, setPremios] = useState<PremioRoleta[]>([]);
  const [saved, setSaved] = useState<PremioRoleta[]>([]);
  const [level, setLevel] = useState<NivelRoleta>(1);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetchAdmin('/api/admin/premios', { cache: 'no-store' });
        const json = await response.json();
        if (!response.ok || !json?.ok) throw new Error(json?.error || 'Não foi possível carregar a roleta.');
        if (!active) return;
        const items = (json.data?.premios || []).map(normalizePrize);
        setPremios(items);
        setSaved(items);
      } catch (cause) {
        if (active) setNotice({ type: 'error', text: cause instanceof Error ? cause.message : 'Não foi possível carregar a roleta.' });
      } finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, []);

  const chances = useMemo(() => chancesPorNivel(premios, level), [premios, level]);
  const stats = useMemo(() => {
    const eligible = premios.filter((item) => item.ativo && !premioReservado(item) && item.probabilidade > 0);
    const winChance = eligible.filter((item) => item.tipo !== 'nada').reduce((sum, item) => sum + (chances.get(item.id) || 0), 0);
    return {
      active: premios.filter((item) => item.ativo).length,
      eligible: eligible.length,
      reserved: premios.filter((item) => premioReservado(item)).length,
      winChance,
    };
  }, [premios, chances]);

  function update(id: number, field: keyof PremioRoleta, value: string | number | boolean) {
    setPremios((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  function changed(item: PremioRoleta) {
    const original = saved.find((savedItem) => savedItem.id === item.id);
    return JSON.stringify(item) !== JSON.stringify(original);
  }

  async function save(item: PremioRoleta) {
    const original = saved.find((savedItem) => savedItem.id === item.id);
    if (!original || !changed(item)) return;
    const operationalChange = original.ativo !== item.ativo || original.participa_roleta !== item.participa_roleta || original.probabilidade !== item.probabilidade;
    if (operationalChange && !window.confirm(`Salvar as novas regras de “${item.nome}”? Isso altera as chances usadas nos próximos giros.`)) return;
    setSavingId(item.id);
    setNotice(null);
    try {
      const response = await fetchAdmin('/api/admin/premios', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, nome: item.nome, emoji: item.emoji, descricao_vitoria: item.descricao_vitoria || null, probabilidade: item.probabilidade, ativo: item.ativo, participa_roleta: item.participa_roleta }),
      });
      const json = await response.json();
      if (!response.ok || !json?.ok) throw new Error(json?.error || 'Não foi possível salvar o prêmio.');
      const updated = normalizePrize(json.data.premio);
      setPremios((current) => current.map((prize) => prize.id === item.id ? updated : prize));
      setSaved((current) => current.map((prize) => prize.id === item.id ? updated : prize));
      setNotice({ type: 'success', text: `“${updated.nome}” foi atualizado.` });
    } catch (cause) {
      setNotice({ type: 'error', text: cause instanceof Error ? cause.message : 'Não foi possível salvar o prêmio.' });
    } finally { setSavingId(null); }
  }

  function discard(id: number) {
    const original = saved.find((item) => item.id === id);
    if (original) setPremios((current) => current.map((item) => item.id === id ? { ...original } : item));
  }

  return <div className="admin-wheel">
    <section className="admin-wheel-overview">
      <div><span>Simulação das chances</span><h2>Compra {levelLabels[level]}</h2><p>Os números abaixo já incluem a vantagem aplicada ao nível escolhido.</p></div>
      <div className="admin-wheel-levels" role="group" aria-label="Nível da compra">{([1, 2, 3] as NivelRoleta[]).map((value) => <button type="button" key={value} className={level === value ? 'active' : ''} onClick={() => setLevel(value)}>{levelLabels[value]}</button>)}</div>
      <dl><div><dt>Chance de ganhar</dt><dd>{percent(stats.winChance)}</dd></div><div><dt>Sem prêmio</dt><dd>{percent(100 - stats.winChance)}</dd></div></dl>
    </section>

    <section className="admin-client-summary" aria-label="Resumo da configuração">
      <Summary label="Cadastrados" value={premios.length} note="Todos os itens preservados" />
      <Summary label="Ativos" value={stats.active} note="Disponíveis no sistema" accent />
      <Summary label="Na roleta" value={stats.eligible} note="Com peso maior que zero" />
      <Summary label="Visuais" value={stats.reserved} note="Aparecem, mas têm 0%" warning />
    </section>

    {notice && <div className={`admin-notice ${notice.type}`} role="status"><strong>{notice.type === 'error' ? 'Ação não concluída' : 'Tudo certo'}</strong><span>{notice.text}</span></div>}

    <div className="admin-wheel-help"><strong>Peso não é porcentagem.</strong><span>O sistema compara o peso de cada prêmio com a soma de todos. Por isso mostramos abaixo a chance real para Bronze, Prata e Ouro.</span></div>

    {loading ? <div className="admin-loading">Carregando configuração…</div> : <section className="admin-wheel-list" aria-label="Prêmios da roleta">
      {premios.map((item) => {
        const reserved = premioReservado(item);
        const satire = item.nome.toLocaleLowerCase('pt-BR').includes('playstation');
        const dirty = changed(item);
        return <article key={item.id} className={`${!item.ativo ? 'is-paused' : ''} ${reserved ? 'is-reserved' : ''}`}>
          <div className="admin-wheel-identity"><label aria-label="Emoji"><input value={item.emoji} maxLength={16} onChange={(event) => update(item.id, 'emoji', event.target.value)} /></label><div><div className="admin-reward-tags"><span className={item.ativo ? 'published' : 'paused'}>{item.ativo ? 'Ativo' : 'Pausado'}</span>{reserved && <span className="offer">Especial visual · 0%</span>}<span>{item.tipo === 'nada' ? 'Sem prêmio' : item.tipo}</span></div><label><span>Nome exibido</span><input value={item.nome} maxLength={255} onChange={(event) => update(item.id, 'nome', event.target.value)} /></label></div></div>
          <label className="admin-wheel-message"><span>Mensagem para o cliente</span><input value={item.descricao_vitoria} maxLength={500} onChange={(event) => update(item.id, 'descricao_vitoria', event.target.value)} placeholder="Mensagem mostrada após o giro" /></label>
          <div className="admin-wheel-settings"><label><span>Peso base</span><input type="number" min="0" max="100000" step="1" value={item.probabilidade} onChange={(event) => update(item.id, 'probabilidade', Number(event.target.value))} disabled={satire} /></label><label className="check"><input type="checkbox" checked={item.ativo} onChange={(event) => update(item.id, 'ativo', event.target.checked)} /><span>Item visível</span></label><label className="check"><input type="checkbox" checked={!reserved} onChange={(event) => update(item.id, 'participa_roleta', event.target.checked)} disabled={satire} /><span>{satire ? 'Somente visual' : 'Pode ser sorteado'}</span></label></div>
          <dl className="admin-wheel-odds"><div><dt>Bronze</dt><dd>{percent(chancesPorNivel(premios, 1).get(item.id) || 0)}</dd></div><div><dt>Prata</dt><dd>{percent(chancesPorNivel(premios, 2).get(item.id) || 0)}</dd></div><div><dt>Ouro</dt><dd>{percent(chancesPorNivel(premios, 3).get(item.id) || 0)}</dd></div></dl>
          <footer><span>{dirty ? 'Alterações ainda não salvas' : 'Configuração salva'}</span><div>{dirty && <button type="button" className="secondary" onClick={() => discard(item.id)} disabled={savingId === item.id}>Desfazer</button>}<button type="button" onClick={() => save(item)} disabled={!dirty || savingId === item.id}>{savingId === item.id ? 'Salvando…' : 'Salvar'}</button></div></footer>
        </article>;
      })}
    </section>}

    <div className="admin-notice"><strong>Nenhum giro foi realizado nesta revisão.</strong><span>As mudanças só passam a valer quando você confirma e salva um item. O PlayStation continua aparecendo como sátira visual, mas o servidor mantém sua chance real em 0%.</span></div>
  </div>;
}

function normalizePrize(value: Partial<PremioRoleta>): PremioRoleta {
  return { id: Number(value.id), nome: value.nome || '', tipo: value.tipo || 'produto', emoji: value.emoji || '🎁', descricao_vitoria: value.descricao_vitoria || '', probabilidade: Math.max(0, Number(value.probabilidade || 0)), ativo: value.ativo !== false, participa_roleta: typeof value.participa_roleta === 'boolean' ? value.participa_roleta : !String(value.nome || '').toLocaleLowerCase('pt-BR').includes('playstation'), valor: value.valor, valor_pontos: value.valor_pontos, cor: value.cor };
}

function Summary({ label, value, note, accent, warning }: { label: string; value: number; note: string; accent?: boolean; warning?: boolean }) {
  return <article className={accent ? 'accent' : warning ? 'warning' : ''}><span>{label}</span><strong>{value.toLocaleString('pt-BR')}</strong><small>{note}</small></article>;
}

function percent(value: number) { return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`; }
