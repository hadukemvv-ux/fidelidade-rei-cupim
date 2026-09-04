'use client';

import { useEffect, useState } from 'react';

type Purpose = 'cadastro' | 'redefinir_pin';

export default function WhatsappOtpVerification({
  telefone,
  proposito,
  onVerified,
}: {
  telefone: string;
  proposito: Purpose;
  onVerified: (verified: boolean) => void;
}) {
  const [solicitacaoId, setSolicitacaoId] = useState('');
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    setSolicitacaoId('');
    setCodigo('');
    setFeedback('');
    setVerified(false);
    setCooldown(0);
    onVerified(false);
  }, [telefone, proposito, onVerified]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function solicitar() {
    setLoading(true);
    setFeedback('');
    try {
      const response = await fetch('/api/otp/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone, proposito }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || 'Não foi possível enviar o código.');
      setSolicitacaoId(body.data.solicitacao_id);
      setCooldown(body.data.reenviar_em_segundos || 60);
      setFeedback(`Código enviado para ${body.data.destino}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível enviar o código.');
    } finally {
      setLoading(false);
    }
  }

  async function verificar() {
    setLoading(true);
    setFeedback('');
    try {
      const response = await fetch('/api/otp/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone, proposito, solicitacao_id: solicitacaoId, codigo }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || 'Código inválido.');
      setVerified(true);
      onVerified(true);
      setFeedback('WhatsApp confirmado com segurança.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Código inválido.');
    } finally {
      setLoading(false);
    }
  }

  if (verified) {
    return (
      <div className="otp-panel otp-success rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
        ✓ WhatsApp confirmado. Você pode continuar.
      </div>
    );
  }

  return (
    <div className="otp-panel space-y-3 rounded-xl border border-[#c5a059]/30 bg-black/20 p-4">
      <p className="text-sm text-zinc-200">
        Enviaremos um código apenas agora para confirmar que este WhatsApp é seu. Os próximos acessos serão com seu PIN, sem mensagem.
      </p>

      {!solicitacaoId ? (
        <button
          type="button"
          onClick={solicitar}
          disabled={loading || telefone.length < 10}
          className="w-full rounded-lg bg-[#25D366] px-4 py-3 font-black text-black disabled:opacity-50"
        >
          {loading ? 'ENVIANDO...' : 'ENVIAR CÓDIGO PELO WHATSAPP'}
        </button>
      ) : (
        <>
          <label className="block text-xs font-bold uppercase tracking-widest text-[#c5a059]">
            Código recebido
          </label>
          <input
            value={codigo}
            onChange={(event) => setCodigo(event.target.value.replace(/\D/g, '').slice(0, 10))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            className="w-full rounded-lg border border-[#c5a059]/30 bg-[#280404] px-4 py-3 text-center text-xl tracking-[0.4em] text-white"
          />
          <button
            type="button"
            onClick={verificar}
            disabled={loading || codigo.length < 4}
            className="w-full rounded-lg bg-[#c5a059] px-4 py-3 font-black text-black disabled:opacity-50"
          >
            {loading ? 'CONFERINDO...' : 'CONFIRMAR CÓDIGO'}
          </button>
          <button
            type="button"
            onClick={solicitar}
            disabled={loading || cooldown > 0}
            className="w-full text-xs text-zinc-400 underline disabled:no-underline disabled:opacity-60"
          >
            {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
          </button>
        </>
      )}

      {feedback && <p className="text-sm text-zinc-200">{feedback}</p>}
    </div>
  );
}
