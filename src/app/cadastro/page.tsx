'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation'; // ✅ Import para redirecionar
import { useMemo, useState } from 'react';

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatPhoneBR(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  // (85) 98825-7044
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function CadastroPage() {
  const router = useRouter(); // ✅ Hook de navegação
  const [nome, setNome] = useState('');
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

  const ganhouBonus = Boolean(dataNascimento); 

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (!nomeOk) {
      setFeedback({ type: 'error', text: 'Digite seu nome completo (mínimo 3 letras).' });
      return;
    }

    if (!telefoneOk) {
      setFeedback({ type: 'error', text: 'Digite seu WhatsApp com DDD (11 dígitos).' });
      return;
    }

    if (!pinOk) {
      setFeedback({ type: 'error', text: 'Digite um PIN de 4 dígitos.' });
      return;
    }

    if (!pinsMatch) {
      setFeedback({ type: 'error', text: 'Os PINs não coincidem.' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/cadastro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: nome.trim(),
          telefone: telefoneDigits,
          data_nascimento: dataNascimento || null, 
          pin: pinDigits, 
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Erro no cadastro');
      }

      setFeedback({
        type: 'success',
        text:
          (data.message || 'Cadastro realizado com sucesso!') +
          (ganhouBonus ? ' ✅ Você ganhou 200 pontos de bônus.' : ' (Dica: preenchendo a data você ganha 200 pontos!)'),
      });

      // Limpa formulário
      setNome('');
      setTelefone('');
      setDataNascimento('');
      setPin('');
      setConfirmPin('');

      // ✅ Redireciona para login após 2 segundos
      setTimeout(() => {
        router.push('/resgate');
      }, 2000);

    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      setFeedback({
        type: 'error',
        text: error.message || 'Não foi possível cadastrar agora. Tente novamente.',
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
            Entre para o <span className="text-[#c5a059] font-bold">Clube Rei do Cupim</span> e comece a acumular benefícios.
            Crie um <span className="text-[#c5a059] font-bold">PIN</span> de 4 dígitos para proteger seus pontos.
          </p>

          <div className="mb-6 rounded-lg border border-[#c5a059]/30 bg-[#280404]/60 px-4 py-3 text-sm">
            <span className="text-[#c5a059] font-bold">🎁 Bônus de boas-vindas:</span>{' '}
            Preencha sua <span className="font-bold">data de nascimento</span> e ganhe{' '}
            <span className="font-bold">200 pontos</span>. (Opcional)
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
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-2">Nome</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Vinicius Rocha"
                className="w-full bg-[#280404] border border-[#c5a059]/30 focus:border-[#c5a059] outline-none rounded-lg px-4 py-3 text-white placeholder:text-zinc-500"
              />
              {!nomeOk && nome.length > 0 && <p className="mt-2 text-xs text-zinc-300/80">Digite pelo menos 3 letras.</p>}
            </div>

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
              <p className="mt-2 text-xs text-zinc-300/80">Precisamos do seu WhatsApp para identificar seus pontos.</p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-2">
                Data de Nascimento (Opcional)
              </label>
              <input
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="w-full bg-[#280404] border border-[#c5a059]/30 focus:border-[#c5a059] outline-none rounded-lg px-4 py-3 text-white"
              />
              <p className="mt-2 text-xs text-zinc-300/80">
                Preencha e ganhe <span className="font-bold text-[#c5a059]">200 pontos</span>.
              </p>
            </div>

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
              <p className="mt-2 text-xs text-zinc-300/80">Use apenas números. Você vai precisar dele no resgate.</p>
              {!pinOk && pin.length > 0 && <p className="mt-2 text-xs text-zinc-300/80">Digite exatamente 4 dígitos.</p>}
            </div>

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
              {!pinsMatch && confirmPin.length === 4 && <p className="mt-2 text-xs text-zinc-300/80">Os PINs não coincidem.</p>}
            </div>

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