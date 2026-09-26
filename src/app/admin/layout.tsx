'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useMemo, useState } from 'react';
import { fetchAdmin } from '@/lib/adminFetch';
import { destinoInicialOperacional, podeAbrirAdmin } from '@/lib/operationalAccess';
import { AdminAccessContext } from './adminAccessContext';
import type { OperationalRole } from '@/lib/operationalAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type NavItem = { href: string; icon: string; label: string; hint: string };
type NavFolder = { label: string; icon: string; hint: string; items: NavItem[] };
type NavGroup = { label: string; items: NavItem[]; folders?: NavFolder[] };

const navigation: NavGroup[] = [
  { label: 'Visão geral', items: [
    { href: '/admin', icon: '⌂', label: 'Início', hint: 'Resumo e atalhos' },
    { href: '/admin/analytics', icon: '▥', label: 'Relatórios', hint: 'Resultados por período' },
  ] },
  { label: 'Clientes e vendas', items: [
    { href: '/admin/clientes', icon: '◎', label: 'Clientes', hint: 'Saldos e histórico' },
    { href: '/admin/financeiro', icon: 'R$', label: 'Financeiro', hint: 'Receita e custos' },
  ] },
  { label: 'Programa de fidelidade', items: [
    { href: '/admin/cardapio', icon: '★', label: 'Recompensas', hint: 'Produtos e pontos' },
    { href: '/admin/roleta', icon: '↻', label: 'Roleta', hint: 'Prêmios e chances' },
  ] },
  { label: 'Operação', items: [
    { href: '/caixa', icon: '▣', label: 'Validar cupom', hint: 'Uso no balcão e delivery' },
    { href: '/admin/operadores', icon: '♙', label: 'Acessos', hint: 'Garçom, caixa, gestão e admin' },
    { href: '/admin/comandas', icon: '▣', label: 'Comandas', hint: 'Fotos pendentes de conferência' },
    { href: '/admin/operacao-roleta', icon: '◷', label: 'Operação da roleta', hint: 'Resultado diário e sinais' },
    { href: '/admin/auditoria', icon: '◷', label: 'Auditoria', hint: 'Quem fez cada ação' },
    { href: '/admin/seguranca', icon: '⛨', label: 'Privacidade', hint: 'Incidentes e contenção' },
  ], folders: [{ label: 'Saipos', icon: '↔', hint: 'Integração e entregas', items: [
    { href: '/admin/saipos', icon: '◇', label: 'Diagnóstico', hint: 'Teste da conexão' },
    { href: '/admin/saipos/entregas', icon: '▣', label: 'Entregas', hint: 'Prazos e etapas' },
    { href: '/admin/importar', icon: '⇧', label: 'Importação', hint: 'Clientes da Saipos' },
  ] }] },
];

const pageInfo: Record<string, { title: string; description: string }> = {
  '/admin': { title: 'Painel principal', description: 'O que importa agora e onde fazer cada tarefa.' },
  '/admin/analytics': { title: 'Relatórios', description: 'Acompanhe adesão, pontos, resgates e uso do programa.' },
  '/admin/clientes': { title: 'Clientes', description: 'Consulte saldos, nível, compras e autorizações.' },
  '/admin/financeiro': { title: 'Financeiro', description: 'Veja faturamento acumulado e o custo estimado da fidelidade.' },
  '/admin/cardapio': { title: 'Recompensas', description: 'Defina quais produtos podem ser trocados por pontos.' },
  '/admin/roleta': { title: 'Roleta', description: 'Ajuste os prêmios e suas probabilidades.' },
  '/admin/sorteio': { title: 'Sorteios', description: 'Prepare o próximo sorteio e consulte resultados.' },
  '/admin/sorteio/previsao': { title: 'Previsão do sorteio', description: 'Confira participantes e chances antes de sortear.' },
  '/admin/sorteio/resumo': { title: 'Resumo do sorteio', description: 'Consulte os números de um sorteio específico.' },
  '/admin/sorteio/ganhadores': { title: 'Ganhadores', description: 'Histórico dos resultados já realizados.' },
  '/admin/garcons': { title: 'Equipe — fluxo antigo pausado', description: 'Use contas individuais, Roleta V2 e auditoria para a operação atual.' },
  '/admin/operadores': { title: 'Acessos da equipe', description: 'Defina o que cada pessoa pode fazer no sistema.' },
  '/admin/comandas': { title: 'Comandas para conferência', description: 'Fotos privadas aguardando a confirmação da gestão.' },
  '/admin/operacao-roleta': { title: 'Operação da roleta', description: 'Acompanhe conciliações, divergências e qualidade operacional por dia.' },
  '/admin/auditoria': { title: 'Auditoria', description: 'Acompanhe liberações, validações e ações administrativas.' },
  '/admin/saipos': { title: 'Saipos — teste de conexão', description: 'Confirme a API sem criar clientes, pontos ou benefícios.' },
  '/admin/saipos/entregas': { title: 'Saipos — entregas', description: 'Examine canal, prazo estimado e etapas de pedidos sem alterar dados.' },
  '/admin/garcons/alertas': { title: 'Alertas antigos pausados', description: 'A segurança operacional agora usa auditoria e contenção de incidentes.' },
  '/admin/seguranca': { title: 'Privacidade e incidentes', description: 'Contenha riscos, preserve evidências e acompanhe a investigação.' },
  '/admin/importar': { title: 'Importação', description: 'Atualize a base de clientes com uma planilha da Saipos.' },
};

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === href;
  if (href === '/admin/sorteio') return pathname.startsWith('/admin/sorteio');
  return pathname === href;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/admin';
  const router = useRouter();
  const [access, setAccess] = useState<'checking' | 'allowed' | 'denied'>('checking');
  const [papel, setPapel] = useState<OperationalRole | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    async function checkAccess() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      const response = await fetchAdmin('/api/operacional/perfil', { cache: 'no-store' }).catch(() => null);
      const payload = await response?.json().catch(() => null);
      if (!active) return;
      const papel = payload?.perfil?.papel;
      if (papel && !podeAbrirAdmin(papel)) {
        router.replace(destinoInicialOperacional(papel));
        return;
      }
      if (response?.status === 401 || response?.status === 403 || !papel) setAccess('denied');
      else { setPapel(papel); setAccess('allowed'); }
    }
    checkAccess();
    return () => { active = false; };
  }, [router]);

  const currentPage = useMemo(() => {
    if (/^\/admin\/garcons\/\d+$/.test(pathname)) {
      return { title: 'Perfil antigo indisponível', description: 'A gestão da equipe acontece agora por acessos individuais.' };
    }
    return pageInfo[pathname] || { title: 'Administração', description: 'Clube Rei do Cupim.' };
  }, [pathname]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (access === 'checking') {
    return <div className="admin-gate"><Image src="/logo.png" width={54} height={54} alt="" /><span>Verificando seu acesso…</span></div>;
  }

  if (access === 'denied') {
    return <main className="admin-gate admin-denied"><span className="admin-gate-mark">!</span><h1>Esta conta não tem acesso administrativo.</h1><p>Entre com o e-mail autorizado da administração.</p><button onClick={logout}>Trocar de conta</button></main>;
  }

  return (
    <AdminAccessContext.Provider value={papel || 'superadmin'}><div className="admin-shell">
      <header className="admin-mobile-bar">
        <Link href="/admin" className="admin-mobile-brand"><Image src="/logo.png" width={36} height={36} alt="" /><span>Painel do Rei</span></Link>
        <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-controls="admin-navigation">{menuOpen ? 'Fechar' : 'Menu'}</button>
      </header>

      <aside className={`admin-sidebar ${menuOpen ? 'is-open' : ''}`} id="admin-navigation">
        <Link href="/admin" className="admin-brand"><Image src="/logo.png" alt="" width={48} height={48} /><span><strong>O Rei do Cupim</strong><small>Administração</small></span></Link>
        <nav className="admin-nav" aria-label="Navegação administrativa">
          {navigation.map((group) => (
            <section key={group.label}>
              <button type="button" className="admin-nav-group-button" aria-expanded={expandedGroups[group.label] ?? Boolean(group.items.some((item) => isActive(pathname, item.href)) || group.folders?.some((folder) => folder.items.some((item) => isActive(pathname, item.href))))} onClick={() => setExpandedGroups((current) => ({ ...current, [group.label]: !(current[group.label] ?? Boolean(group.items.some((item) => isActive(pathname, item.href)) || group.folders?.some((folder) => folder.items.some((item) => isActive(pathname, item.href))))) }))}>{group.label}<span aria-hidden="true">⌄</span></button>
              {(expandedGroups[group.label] ?? Boolean(group.items.some((item) => isActive(pathname, item.href)) || group.folders?.some((folder) => folder.items.some((item) => isActive(pathname, item.href))))) && <div className="admin-nav-group-items">{group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}><i aria-hidden="true">{item.icon}</i><span><strong>{item.label}</strong><small>{item.hint}</small></span></Link>;
              })}{group.folders?.map((folder) => {
                const active = folder.items.some((item) => isActive(pathname, item.href));
                const open = expandedFolders[folder.label] ?? active;
                return <div className="admin-nav-folder" key={folder.label}>
                  <button type="button" className={`admin-nav-folder-button ${active ? 'active' : ''}`} aria-expanded={open} onClick={() => setExpandedFolders((current) => ({ ...current, [folder.label]: !open }))}><i aria-hidden="true">{folder.icon}</i><span><strong>{folder.label}</strong><small>{folder.hint}</small></span><b aria-hidden="true">⌄</b></button>
                  {open && <div className="admin-nav-folder-items">{folder.items.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={isActive(pathname, item.href) ? 'active' : ''} aria-current={isActive(pathname, item.href) ? 'page' : undefined}><i aria-hidden="true">{item.icon}</i><span><strong>{item.label}</strong><small>{item.hint}</small></span></Link>)}</div>}
                </div>;
              })}</div>}
            </section>
          ))}
        </nav>
        <div className="admin-sidebar-footer"><Link href="/" target="_blank">Abrir site do cliente ↗</Link><button onClick={logout}>Sair da conta</button></div>
      </aside>

      {menuOpen && <button className="admin-menu-backdrop" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />}

      <main className="admin-main">
        <header className="admin-page-header"><div><span>{papel === 'gestor' ? 'Gestão · somente consulta' : 'Administração'}</span><h1>{currentPage.title}</h1><p>{papel === 'gestor' ? 'Você pode consultar os dados. Alterações são exclusivas do superadmin.' : currentPage.description}</p></div><Link href="/" target="_blank">Ver site ↗</Link></header>
        <div className="admin-content">{children}</div>
      </main>
    </div></AdminAccessContext.Provider>
  );
}
