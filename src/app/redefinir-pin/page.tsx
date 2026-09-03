'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import WhatsappOtpVerification from '@/components/WhatsappOtpVerification';

function digits(value: string) {
  return value.replace(/\D/g, '');
}

function formatPhone(value: string) {
  const phone = digits(value).slice(0, 11);
  if (phone.length <= 2) return phone;
  if (phone.length <= 7) return `(${phone.slice(0, 2)}) ${phone.slice(2)}`;
  return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
}

export default function RedefinirPinPage() {
  const [telefone, setTelefone] = useState('');
  const [novoPin, setNovoPin] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [verificado, setVerificado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [concluido, setConcluido] = useState(false);
  const telefoneDigits = useMemo(() => digits(telefone), [telefone]);
  const onVerified = useCallback((value: boolean) => setVerificado(value), []);

  async function salvar(event: React.FormEvent) {
    event.preventDefault();
    setFeedback('');
    if (!verificado) return setFeedback('Confirme seu WhatsApp primeiro.');
    if (!/^\d{4}$/.test(novoPin)) return setFeedback('O novo PIN precisa ter 4 números.');
    if (novoPin !== confirmacao) return setFeedback('Os PINs não coincidem.');

    setLoading(true);
    try {
      const response = await fetch('/api/redefinir-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: telefoneDigits, novo_pin: novoPin }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || 'Não foi possível trocar o PIN.');
      setConcluido(true);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível trocar o PIN.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#280404] px-5 py-12 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-[#c5a059]/30 bg-[#4d0808] p-7 shadow-2xl">
        <h1 className="text-center text-2xl font-black text-[#c5a059]">RECUPERAR PIN</h1>
        <p className="mb-6 mt-2 text-center text-sm text-zinc-300">
          Uma única confirmação pelo WhatsApp protege seus pontos. Depois, volte a entrar normalmente com o novo PIN.
        </p>

        {concluido ? (
          <div className="text-center">
            <p className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-emerald-100">
              PIN alterado com sucesso.
            </p>
            <Link href="/resgate" className="mt-5 block rounded-xl bg-[#c5a059] py-3 font-black text-black">
              ENTRAR NA MINHA CONTA
            </Link>
          </div>
        ) : (
          <form onSubmit={salvar} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#c5a059]">WhatsApp</label>
              <input
                value={telefone}
                onChange={(event) => setTelefone(formatPhone(event.target.value))}
                inputMode="tel"
                placeholder="(85) 9XXXX-XXXX"
                className="w-full rounded-lg border border-[#c5a059]/30 bg-[#280404] px-4 py-3"
              />
            </div>

            <WhatsappOtpVerification telefone={telefoneDigits} proposito="redefinir_pin" onVerified={onVerified} />

            {verificado && (
              <>
                <input
                  value={novoPin}
                  onChange={(event) => setNovoPin(digits(event.target.value).slice(0, 4))}
                  inputMode="numeric"
                  type="password"
                  placeholder="Novo PIN de 4 números"
                  className="w-full rounded-lg border border-[#c5a059]/30 bg-[#280404] px-4 py-3"
                />
                <input
                  value={confirmacao}
                  onChange={(event) => setConfirmacao(digits(event.target.value).slice(0, 4))}
                  inputMode="numeric"
                  type="password"
                  placeholder="Repita o novo PIN"
                  className="w-full rounded-lg border border-[#c5a059]/30 bg-[#280404] px-4 py-3"
                />
              </>
            )}

            {feedback && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-100">{feedback}</p>}
            <button
              disabled={!verificado || loading}
              className="w-full rounded-xl bg-[#e31e24] py-4 font-black disabled:opacity-50"
            >
              {loading ? 'SALVANDO...' : 'CRIAR NOVO PIN'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
