'use client';

import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function OperationalLogout({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');

  async function signOut() {
    setSigningOut(true);
    setError('');
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      setError('Não foi possível encerrar a sessão. Tente novamente.');
      setSigningOut(false);
      return;
    }
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="grid justify-items-end gap-1">
      <button type="button" onClick={signOut} disabled={signingOut} className={className}>
        {signingOut ? 'Saindo…' : 'Sair da conta'}
      </button>
      {error && <span role="alert" className="text-xs text-red-300">{error}</span>}
    </div>
  );
}
