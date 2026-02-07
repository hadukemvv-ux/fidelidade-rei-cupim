'use client';
import { useState, useEffect, useMemo } from 'react';

function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

export default function CompletarCadastroPage() {

  const [telefone, setTelefone] = useState('');
  const telefoneDigits = useMemo(() => onlyDigits(telefone), [telefone]);

  // Campos do formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [dataNasc, setDataNasc] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');

  // Controle
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Carregar telefone da URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tel = params.get('telefone');
    if (tel && onlyDigits(tel).length === 11) {
      setTelefone(onlyDigits(tel));
    }
  }, []);

  // Enviar formulário
  async function enviar() {
    setFeedback(null);

    if (!telefoneDigits || telefoneDigits.length !== 11) {
      setFeedback({ type: 'error', text: 'Telefone inválido.' });
      return;
    }
    if (!nome.trim()) {
      setFeedback({ type: 'error', text: 'Digite seu nome.' });
      return;
    }
    if (!email.includes('@')) {
      setFeedback({ type: 'error', text: 'Digite um email válido.' });
      return;
    }
    if (!dataNasc) {
      setFeedback({ type: 'error', text: 'Selecione sua data de nascimento.' });
      return;
    }
    if (pin.length !== 4 || pin2.length !== 4) {
      setFeedback({ type: 'error', text: 'PIN deve ter 4 dígitos.' });
      return;
    }
    if (pin !== pin2) {
      setFeedback({ type: 'error', text: 'Os PINs não coincidem.' });
      return;
    }

    setLoading(true);

    try {
      // Completar cadastro
      const r = await fetch('/api/resgate/completar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone: telefoneDigits,
          nome,
          email,
          data_nascimento: dataNasc,
          pin
        })
      });

      const data = await r.json();
      if (!r.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao completar cadastro.');
      }

      // Login automático
      const login = await fetch('/api/resgate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: telefoneDigits, pin })
      });
      const loginData = await login.json();

      if (!login.ok || !loginData.ok) {
        throw new Error(loginData.error || 'Erro ao entrar automaticamente.');
      }

      // Redireciona para a área logada
      window.location.href = '/resgate';

    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#280404] text-white px-6 pt-10 pb-20">

      <h1 className="text-center text-2xl font-black mb-6 text-[#c5a059]">
        Finalizar Cadastro
      </h1>

      {feedback && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm border shadow-md ${
          feedback.type === 'success'
            ? 'bg-emerald-900/60 border-emerald-500 text-emerald-100'
            : 'bg-red-900/60 border-red-500 text-red-100'
        }`}>
          {feedback.text}
        </div>
      )}

      <div className="bg-[#4d0808] p-6 rounded-2xl border border-[#c5a059]/30 space-y-4">

        {/* Nome */}
        <input
          value={nome}
          onChange={(e)=> setNome(e.target.value)}
          placeholder="Nome completo"
          className="w-full bg-black/20 p-3 rounded-lg border border-[#c5a059]/30 text-white"
        />

        {/* Email */}
        <input
          value={email}
          onChange={(e)=> setEmail(e.target.value)}
          placeholder="email@exemplo.com"
          className="w-full bg-black/20 p-3 rounded-lg border border-[#c5a059]/30 text-white"
        />

        {/* Data */}
        <input
          type="date"
          value={dataNasc}
          onChange={(e)=> setDataNasc(e.target.value)}
          className="w-full bg-black/20 p-3 rounded-lg border border-[#c5a059]/30 text-white"
        />

        {/* PIN */}
        <input
          value={pin}
          onChange={(e)=> setPin(onlyDigits(e.target.value).slice(0,4))}
          placeholder="Crie um PIN (4 dígitos)"
          className="w-full bg-black/20 p-3 rounded-lg border border-[#c5a059]/30 text-white text-center tracking-widest"
        />

        {/* Confirmar PIN */}
        <input
          value={pin2}
          onChange={(e)=> setPin2(onlyDigits(e.target.value).slice(0,4))}
          placeholder="Confirmar PIN"
          className="w-full bg-black/20 p-3 rounded-lg border border-[#c5a059]/30 text-white text-center tracking-widest"
        />

        {/* Botão */}
        <button
          onClick={enviar}
          disabled={loading}
          className="w-full bg-[#e31e24] text-white font-bold py-3 rounded-lg mt-4"
        >
          {loading ? 'SALVANDO...' : 'FINALIZAR CADASTRO'}
        </button>

      </div>

    </div>
  );
}