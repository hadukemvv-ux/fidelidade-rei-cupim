'use client';

import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) {
      setError('E-mail ou senha incorretos. Confira os dados e tente novamente.');
      setLoading(false);
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-brand">
        <Link href="/" aria-label="Voltar ao site"><Image src="/logo.png" alt="" width={70} height={70} /><span>O Rei do Cupim</span></Link>
        <div><span>Área restrita</span><h1>Controle claro.<br /><em>Operação simples.</em></h1><p>Clientes, recompensas, equipe e resultados organizados em um só lugar.</p></div>
      </section>
      <section className="admin-login-form-side">
        <form onSubmit={handleLogin} className="admin-login-form">
          <div><span>Administração</span><h2>Entre no painel</h2><p>Use o e-mail autorizado da empresa.</p></div>
          {error && <p className="admin-login-error" role="alert">{error}</p>}
          <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="seuemail@empresa.com.br" /></label>
          <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required placeholder="Sua senha" /></label>
          <button disabled={loading}>{loading ? 'Verificando…' : 'Entrar no painel'}<span aria-hidden="true">→</span></button>
          <Link href="/">← Voltar ao site</Link>
        </form>
      </section>
    </main>
  );
}
