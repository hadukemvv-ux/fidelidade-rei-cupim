'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

// SUPABASE
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""; // <<< CORREÇÃO CRÍTICA AQUI
  const router = useRouter();

  const [autorizado, setAutorizado] = useState(false);
  const [verificando, setVerificando] = useState(true);

  // VERIFICAR SESSÃO ADMIN
  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/admin/login');
      } else {
        setAutorizado(true);
      }
      setVerificando(false);
    }
    check();
  }, []);

  if (verificando) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-[#c5a059]">
        Verificando acesso…
      </div>
    );
  }

  if (!autorizado) return null;

  // =========================
  // MENU PRINCIPAL + SUBMENUS
  // =========================

  const menu = [
    { href: '/admin', icon: '🏠', label: 'Início' },

    { href: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
    { href: '/admin/analytics', icon: '📈', label: 'Analytics' },
    { href: '/admin/financeiro', icon: '💰', label: 'Financeiro' },
    { href: '/admin/roleta', icon: '🎰', label: 'Roleta' },
    { href: '/admin/cardapio', icon: '🍔', label: 'Cardápio' },

    // ---------- SORTEIO (COM SUBMENU) ----------
    {
      href: '/admin/sorteio',
      icon: '🎁',
      label: 'Sorteio',
      submenu: [
        { href: '/admin/sorteio/previsao', label: '📋 Previsão' },
        
        { href: '/admin/sorteio/resumo', label: '📑 Resumo' },
        { href: '/admin/sorteio/ganhadores', label: '🏆 Ganhadores' },
      ]
    },
    // -------------------------------------------

    { href: '/admin/garcons', icon: '👔', label: 'Equipe' },
    { href: '/admin/garcons/alertas', icon: '🔥', label: 'Anti-Fraude' },
    { href: '/admin/importar', icon: '📥', label: 'Importação' },
  ];

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/admin/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">

      {/* SIDEBAR FIXA */}
      <aside className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col py-8 px-4">
        
        <div className="mb-10 text-center">
          <h1 className="text-xl font-black text-[#c5a059] uppercase">
            Rei do Cupim
          </h1>
          <p className="text-xs text-gray-500 mt-1 tracking-widest">Administração</p>
        </div>

        {/* MENU */}
        <nav className="flex-1 space-y-1">
          {menu.map((item) => {
            const ativo = pathname === item.href;

            return (
              <div key={item.href}>
                
                {/* ITEM PRINCIPAL */}
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition
                    ${ativo 
                      ? 'bg-[#c5a059] text-black shadow-lg' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>

                {/* SUBMENU DO SORTEIO */}
                {item.submenu && pathname.startsWith('/admin/sorteio') && (
                  <div className="ml-8 mt-2 space-y-1">
                    {item.submenu.map((sub) => {
                      const ativoSub = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`
                            block px-3 py-2 rounded-md text-xs font-bold transition
                            ${ativoSub 
                              ? 'bg-[#c5a059] text-black shadow-md' 
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }
                          `}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}

              </div>
            );
          })}
        </nav>

        {/* LOGOUT */}
        <button
          onClick={logout}
          className="mt-8 border border-red-800 text-red-400 py-2 px-4 rounded-lg text-xs hover:bg-red-900/20 transition"
        >
          SAIR
        </button>

      </aside>

      {/* CONTEÚDO */}
      <main className="flex-1 p-10">

        {/* HEADER INTERNO */}
        <header className="mb-10 border-b border-gray-800 pb-6">
          <h1 className="text-3xl font-black tracking-tight">
            {(pathname || '').split('/').pop()?.toUpperCase() || 'ADMIN'}
          </h1>
        </header>

        <div className="animate-fade-in">
          {children}
        </div>

      </main>

    </div>
  );
}