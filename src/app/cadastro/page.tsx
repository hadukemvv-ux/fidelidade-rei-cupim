'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatPhoneBR(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function CadastroPage() {
  const router = useRouter();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const telefoneDigits = useMemo(() => onlyDigits(telefone), [telefone]);
  const pinDigits = useMemo(() => onlyDigits(pin).slice(0, 4), [pin]);
  const confirmPinDigits = useMemo(() => onlyDigits(confirmPin).slice(0, 4), [confirmPin]);

  const nomeOk = nome.trim().length >= 3;
  const telefoneOk = telefoneDigits.length === 11;
  const pinOk = pinDigits.length === 4;
  const pinsMatch = pinOk && pinDigits === confirmPinDigits;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase());

  const ganhouBonus = Boolean(dataNascimento);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (!nomeOk)
      return setFeedback({ type: 'error', text: 'Digite seu nome completo (mínimo 3 letras).' });

    if (!emailOk)
      return setFeedback({ type: 'error', text: 'Digite um email válido.' });

    if (!telefoneOk)
      return setFeedback({ type: 'error', text: 'Digite seu WhatsApp com DDD (11 dígitos).' });

    if (!pinOk)
      return setFeedback({ type: 'error', text: 'Digite um PIN de 4 dígitos.' });

    if (!pinsMatch)
      return setFeedback({ type: 'error', text: 'Os PINs não coincidem.' });

    setLoading(true);

    try {
      const response = await fetch('/api/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.toLowerCase().trim(),
          telefone: telefoneDigits,
          data_nascimento: dataNascimento || null,
          pin: pinDigits,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setFeedback({ type: 'error', text: data.error || 'Erro no cadastro.' });
        setLoading(false);
        return;
      }

      setFeedback({
        type: 'success',
        text: (data.message || 'Cadastro realizado com sucesso!')
          + (ganhouBonus ? ' 🎁 Você ganhou 200 pontos de bônus.' : ''),
      });

      setNome('');
      setEmail('');
      setTelefone('');
      setDataNascimento('');
      setPin('');
      setConfirmPin('');

      setTimeout(() => router.push('/resgate'), 1800);

    } catch (error: any) {
      setFeedback({
        type: 'error',
        text: error.message || 'Erro inesperado. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#280404] text-white font-sans">
      <header className="pt-10 pb-6 flex flex-col items-center justify-center">
        <div className="relative w-40 h-40 mb-4">
          <img src="/logo.png" alt="Logo Rei do Cupim" className="w-full h-full object-contain" />
        </div>

        <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-center">
          <span className="bg-gradient-to-r from-[#c5a059] via-white to-[#c5a059] bg-clip-text text-transparent">
            CADASTRO
          </span>
        </h1>

        <div className="w-24 h-1 bg-[#e31e24] mt-4 shadow-[0_0_10px_#e31e24]"></div>
      </header>

      <main className="max-w-lg mx-auto px-6 pb-16">
        <div className="bg-[#4d0808] border border-black/20 rounded-xl p-8 shadow-xl">

          <p className="text-zinc-200/90 text-sm mb-8">
            Entre para o <span className="text-[#c5a059] font-bold">Clube Rei do Cupim</span>!
            Crie um <span className="text-[#c5a059] font-bold">PIN</span> de 4 dígitos para proteger seus pontos.
          </p>

          <div className="mb-6 rounded-lg border border-[#c5a059]/30 bg-[#280404]/60 px-4 py-3 text-sm">
            <span className="text-[#c5a059] font-bold">🎁 Bônus de boas-vindas:</span>{' '}
            Informe sua <span className="font-bold">data de nascimento</span> e ganhe{' '}
            <span className="font-bold">200 pontos</span>.
          </div>

          {feedback && (
            <div
              className={`mb-6 rounded-lg px-4 py-3 text-sm border ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-100'
                  : 'bg-red-500/10 border-red-400/30 text-red-100'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* NOME */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-2">Nome</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Vinicius Rocha"
                className="w-full bg-[#280404] border border-[#c5a059]/30 focus:border-[#c5a059] outline-none rounded-lg px-4 py-3 text-white placeholder:text-zinc-500"
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-2">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="exemplo@gmail.com"
                className="w-full bg-[#280404] border border-[#c5a059]/30 focus:border-[#c5a059] outline-none rounded-lg px-4 py-3 text-white placeholder:text-zinc-500"
              />

              {!emailOk && email.length > 3 && (
                <p className="mt-2 text-xs text-zinc-300/80">Digite um email válido.</p>
              )}
            </div>

            {/* TELEFONE */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-2">
                WhatsApp (com DDD)
              </label>
              <input
                value={telefone}
                onChange={(e) => setTelefone(formatPhoneBR(e.target.value))}
                inputMode="numeric"
                placeholder="(85) 9XXXX-XXXX"
                className="w-full bg-[#280404] border border-[#c5a059]/30 focus:border-[#c5a059] outline-none rounded-lg px-4 py-3 text-white placeholder:text-zinc-500"
              />
            </div>

            {/* DATA DE NASCIMENTO */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-2">
                Data de Nascimento (Opcional)
              </label>
              <input
                type="date"
                min="1920-01-01"
                max={new Date().toISOString().split('T')[0]}
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="w-full bg-[#280404] border border-[#c5a059]/30 focus:border-[#c5a059] outline-none rounded-lg px-4 py-3 text-white"
              />
            </div>

            {/* PIN */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-2">
                PIN de 4 dígitos
              </label>
              <input
                value={pin}
                onChange={(e) => setPin(onlyDigits(e.target.value).slice(0, 4))}
                inputMode="numeric"
                placeholder="Ex: 1234"
                className="w-full bg-[#280404] border border-[#c5a059]/30 focus:border-[#c5a059] outline-none rounded-lg px-4 py-3 text-white placeholder:text-zinc-500"
              />
            </div>

            {/* CONFIRMAR PIN */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-2">
                Confirmar PIN
              </label>
              <input
                value={confirmPin}
                onChange={(e) => setConfirmPin(onlyDigits(e.target.value).slice(0, 4))}
                inputMode="numeric"
                placeholder="Digite o PIN novamente"
                className="w-full bg-[#280404] border border-[#c5a059]/30 focus:border-[#c5a059] outline-none rounded-lg px-4 py-3 text-white placeholder:text-zinc-500"
              />
            </div>

            {/* BOTÃO */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#e31e24] hover:bg-[#c1191f] disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-4 rounded-sm text-lg transition-all shadow-[6px_6px_0px_#c5a059] active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              {loading ? 'CADASTRANDO...' : 'CADASTRAR'}
            </button>

            <div className="flex items-center justify-between pt-2 text-sm">
              <Link href="/" className="text-[#c5a059] hover:text-white transition-colors">
                ← Voltar para Home
              </Link>
              <Link href="/resgate" className="text-zinc-300 hover:text-white transition-colors">
                Já sou cliente → Consultar
              </Link>
            </div>

          </form>
        </div>
      </main>

      <footer className="py-10 px-6 border-t border-[#4d0808]/50 text-center bg-[#1a0a0a]">
        <p className="text-[#c5a059] italic font-medium">Sua Majestade em Qualidade e Sabor!</p>
      </footer>
    </div>
  );
}