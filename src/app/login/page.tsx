'use client';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Conexão manual
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('❌ Acesso negado: ' + error.message);
      setLoading(false);
    } else {
      // Sucesso!
      router.push('/admin'); 
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
      <form onSubmit={handleLogin} className="bg-gray-900 p-8 rounded-2xl border border-[#c5a059] w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-[#c5a059] uppercase">👑 Área Restrita</h1>
            <p className="text-gray-400 mt-2 text-sm">Apenas para a Realeza</p>
        </div>

        <div className="space-y-4">
            <input
            type="email"
            placeholder="E-mail Real"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black text-white p-4 rounded-xl border border-gray-700 focus:border-[#c5a059] outline-none transition-colors"
            />
            <input
            type="password"
            placeholder="Senha Secreta"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black text-white p-4 rounded-xl border border-gray-700 focus:border-[#c5a059] outline-none transition-colors"
            />
        </div>

        <button 
            disabled={loading}
            className="w-full bg-[#c5a059] hover:bg-[#b08d45] text-black font-black uppercase tracking-wider p-4 rounded-xl mt-8 transition-transform hover:scale-105 shadow-lg disabled:opacity-50"
        >
            {loading ? 'Validando...' : 'ENTRAR NO CASTELO'}
        </button>
      </form>
    </div>
  );
}