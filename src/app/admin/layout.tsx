'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useMemo, useState } from 'react';
import { fetchAdmin } from '@/lib/adminFetch';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type NavItem = { href: string; icon: string; label: string; hint: string };

const navigation: Array<{ label: string; items: NavItem[] }> = [
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
    { href: '/admin/sorteio', icon: '◇', label: 'Sorteios', hint: 'Configuração e resultados' },
  ] },
  { label: 'Operação', items: [
    { href: '/admin/garcons', icon: '♟', label: 'Equipe', hint: 'Garçons e desempenho' },
    { href: '/admin/garcons/alertas', icon: '!', label: 'Segurança', hint: 'Alertas e bloqueios' },
    { href: '/admin/importar', icon: '⇧', label: 'Importação', hint: 'Clientes da Saipos' },
  ] },
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
  '/admin/garcons': { title: 'Equipe', description: 'Cadastre garçons e acompanhe o uso da roleta.' },
  '/admin/garcons/alertas': { title: 'Segurança', description: 'Revise atividades suspeitas e desbloqueios.' },
  '/admin/importar': { title: 'Importação', description: 'Atualize a base de clientes com uma planilha da Saipos.' },
};

const raffleNavigation = [
  { href: '/admin/sorteio', label: 'Configuração' },
  { href: '/admin/sorteio/previsao', label: 'Participantes' },
  { href: '/admin/sorteio/resumo', label: 'Resumo' },
  { href: '/admin/sorteio/ganhadores', label: 'Ganhadores' },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === href;
  if (href === '/admin/sorteio') return pathname.startsWith('/admin/sorteio');
  if (href === '/admin/garcons') return pathname === href || /^\/admin\/garcons\/\d+$/.test(pathname);
  return pathname === href;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/admin';
  const router = useRouter();
  const [access, setAccess] = useState<'checking' | 'allowed' | 'denied'>('checking');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function checkAccess() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      const response = await fetchAdmin('/api/admin/dashboard', { cache: 'no-store' }).catch(() => null);
      if (!active) return;
      if (response?.status === 401 || response?.status === 403) setAccess('denied');
      else setAccess('allowed');
    }
    checkAccess();
    return () => { active = false; };
  }, [router]);

  const currentPage = useMemo(() => {
    if (/^\/admin\/garcons\/\d+$/.test(pathname)) {
      return { title: 'Perfil da equipe', description: 'Histórico, status e atividade deste garçom.' };
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
    <div className="admin-shell">
      <header className="admin-mobile-bar">
        <Link href="/admin" className="admin-mobile-brand"><Image src="/logo.png" width={36} height={36} alt="" /><span>Painel do Rei</span></Link>
        <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-controls="admin-navigation">{menuOpen ? 'Fechar' : 'Menu'}</button>
      </header>

      <aside className={`admin-sidebar ${menuOpen ? 'is-open' : ''}`} id="admin-navigation">
        <Link href="/admin" className="admin-brand"><Image src="/logo.png" alt="" width={48} height={48} /><span><strong>O Rei do Cupim</strong><small>Administração</small></span></Link>
        <nav className="admin-nav" aria-label="Navegação administrativa">
          {navigation.map((group) => (
            <section key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}><i aria-hidden="true">{item.icon}</i><span><strong>{item.label}</strong><small>{item.hint}</small></span></Link>;
              })}
            </section>
          ))}
        </nav>
        <div className="admin-sidebar-footer"><Link href="/" target="_blank">Abrir site do cliente ↗</Link><button onClick={logout}>Sair da conta</button></div>
      </aside>

      {menuOpen && <button className="admin-menu-backdrop" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />}

      <main className="admin-main">
        <header className="admin-page-header"><div><span>Administração</span><h1>{currentPage.title}</h1><p>{currentPage.description}</p></div><Link href="/" target="_blank">Ver site ↗</Link></header>
        {pathname.startsWith('/admin/sorteio') && <nav className="admin-subnav" aria-label="Seções dos sorteios">{raffleNavigation.map((item) => <Link key={item.href} href={item.href} className={pathname === item.href ? 'active' : ''}>{item.label}</Link>)}</nav>}
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
