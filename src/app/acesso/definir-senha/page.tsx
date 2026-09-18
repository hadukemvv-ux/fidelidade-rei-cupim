'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function DefinirSenhaPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<'verificando' | 'pronto' | 'invalido'>('verificando');
  const [senha, setSenha] = useState(''); const [confirmacao, setConfirmacao] = useState(''); const [mensagem, setMensagem] = useState(''); const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function preparar() {
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) { setEstado('invalido'); setMensagem('Este link expirou ou já foi usado. Peça um novo acesso à administração.'); return; }
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) { setEstado('invalido'); setMensagem('Este link não contém uma sessão válida. Peça um novo acesso à administração.'); return; }
      setEstado('pronto');
    }
    preparar().catch(() => { setEstado('invalido'); setMensagem('Não foi possível validar este link. Peça um novo acesso à administração.'); });
  }, []);

  async function salvar(event: React.FormEvent) {
    event.preventDefault(); setMensagem('');
    if (senha.length < 10) { setMensagem('Use pelo menos 10 caracteres na senha.'); return; }
    if (senha !== confirmacao) { setMensagem('As duas senhas não são iguais.'); return; }
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) { setMensagem('Não foi possível salvar a senha. Peça um novo acesso se o problema continuar.'); setSalvando(false); return; }
    router.replace('/login?acesso=criado'); router.refresh();
  }

  return <main className="admin-login-page"><section className="admin-login-brand"><Link href="/" aria-label="Voltar ao site"><span>O Rei do Cupim</span></Link><div><span>Primeiro acesso</span><h1>Crie sua<br /><em>senha de trabalho.</em></h1><p>Esta conta será usada apenas na operação autorizada do Clube.</p></div></section><section className="admin-login-form-side"><form onSubmit={salvar} className="admin-login-form"><div><span>Acesso da equipe</span><h2>Definir senha</h2><p>Escolha uma senha pessoal; ela nunca será enviada para a administração.</p></div>{estado === 'verificando' && <p>Validando o convite…</p>}{estado === 'pronto' && <><label>Nova senha<input type="password" value={senha} onChange={(event) => setSenha(event.target.value)} autoComplete="new-password" required minLength={10} /></label><label>Repita a senha<input type="password" value={confirmacao} onChange={(event) => setConfirmacao(event.target.value)} autoComplete="new-password" required minLength={10} /></label><button disabled={salvando}>{salvando ? 'Salvando…' : 'Criar senha e entrar'}<span aria-hidden="true">→</span></button></>}{mensagem && <p className="admin-login-error" role="alert">{mensagem}</p>}<Link href="/login">← Voltar ao login</Link></form></section></main>;
}
