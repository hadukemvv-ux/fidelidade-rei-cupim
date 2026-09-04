'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import WhatsappOtpVerification from '@/components/WhatsappOtpVerification';

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

  // CAMPOS DO FORMULÁRIO
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [aceitaAniversario, setAceitaAniversario] = useState(false);
  const [whatsappVerificado, setWhatsappVerificado] = useState(false);

  // CONTROLE
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] =
    useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // MEMO
  const telefoneDigits = useMemo(() => onlyDigits(telefone), [telefone]);
  const pinDigits = useMemo(() => onlyDigits(pin).slice(0, 4), [pin]);
  const confirmPinDigits = useMemo(() => onlyDigits(confirmPin).slice(0, 4), [confirmPin]);

  const nomeOk = nome.trim().length >= 3;
  const telefoneOk = telefoneDigits.length === 11;
  const pinOk = pinDigits.length === 4;
  const pinsMatch = pinOk && pinDigits === confirmPinDigits;

  // ===========================================================
  // 1) PRÉ-CARREGAR TELEFONE DA URL
  // ===========================================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("telefone");

    if (t && onlyDigits(t).length === 11) {
      setTelefone(formatPhoneBR(t));
    }
  }, []);

  // ===========================================================
  // 2) SUBMIT DO FORMULÁRIO
  // ===========================================================
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (!nomeOk)
      return setFeedback({ type: 'error', text: 'Digite seu nome completo (mínimo 3 letras).' });

    if (!telefoneOk)
      return setFeedback({ type: 'error', text: 'Digite seu WhatsApp com DDD (11 dígitos).' });

    if (!pinOk)
      return setFeedback({ type: 'error', text: 'Digite um PIN de 4 dígitos.' });

    if (!pinsMatch)
      return setFeedback({ type: 'error', text: 'Os PINs não coincidem.' });

    if (dataNascimento && !aceitaAniversario)
      return setFeedback({ type: 'error', text: 'Para receber a surpresa, autorize as mensagens de aniversário — ou deixe a data em branco.' });

    if (!whatsappVerificado)
      return setFeedback({ type: 'error', text: 'Confirme o código enviado ao seu WhatsApp.' });

    setLoading(true);

    try {
      // CADASTRAR NOVO CLIENTE
      const response = await fetch('/api/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          telefone: telefoneDigits,
          pin: pinDigits,
          data_nascimento: dataNascimento || null,
          aceita_whatsapp_aniversario: Boolean(dataNascimento && aceitaAniversario),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setFeedback({ type: 'error', text: data.error || 'Erro no cadastro.' });
        setLoading(false);
        return;
      }

      // Feedback no cadastro
      setFeedback({
        type: 'success',
        text: `${data.message || 'Cadastro realizado com sucesso!'} Você ganhou 200 pontos para usar na primeira entrega.`,
      });

      // LOGIN AUTOMÁTICO (NOVO NO FLUXO PROFISSONAL)
      const login = await fetch('/api/resgate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone: telefoneDigits,
          pin: pinDigits,
        }),
      });

      const loginData = await login.json();

      if (!login.ok || !loginData.ok) {
        throw new Error(loginData.error || 'Erro ao entrar automaticamente.');
      }

      // REDIRECIONAR PARA O RESGATE JÁ LOGADO
      router.push('/resgate');

    } catch (error: unknown) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro inesperado. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="signup-page">
      <section className="signup-promise" aria-labelledby="signup-title">
        <Image src="/images/home/hero-cupim.webp" alt="Cupim assado na brasa" fill priority sizes="(max-width: 899px) 100vw, 48vw" />
        <div className="signup-promise-shade" />
        <Link href="/" className="signup-brand" aria-label="Voltar ao início"><Image src="/logo.png" alt="" width={62} height={62} /><span>O Rei do Cupim</span></Link>
        <div className="signup-promise-copy">
          <span>Boas-vindas do Rei</span>
          <h1 id="signup-title">Cadastre-se hoje.<br /><em>A primeira entrega é por nossa conta.</em></h1>
          <p>Você começa com 200 pontos — o valor exato para resgatar a taxa de entrega no primeiro pedido direto.</p>
          <div className="signup-benefits" aria-label="Benefícios do clube">
            <div><strong>200</strong><span>pontos na entrada</span></div>
            <div><strong>+</strong><span>pontos e cashback</span></div>
            <div><strong>🎁</strong><span>surpresa no aniversário</span></div>
          </div>
        </div>
      </section>

      <section className="signup-form-side" aria-label="Cadastro no clube">
        <div className="signup-mobile-offer"><strong>Entrega grátis de boas-vindas</strong><span>Ganhe 200 pontos ao concluir.</span></div>
        <div className="signup-form-wrap">
          <div className="signup-form-heading"><span>Leva cerca de 1 minuto</span><h2>Entre para o clube.</h2><p>Só precisamos do essencial. Seu WhatsApp será confirmado uma única vez e os próximos acessos serão feitos com o PIN.</p></div>
          {feedback && <div className={`signup-feedback ${feedback.type}`} role="status">{feedback.text}</div>}
          <form onSubmit={handleSubmit} className="signup-form">
            <div className="signup-field"><label htmlFor="signup-name">Seu nome</label><input id="signup-name" value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="name" placeholder="Como podemos chamar você?" /></div>
            <div className="signup-field"><label htmlFor="signup-phone">WhatsApp com DDD</label><div className="signup-phone"><span>+55</span><input id="signup-phone" value={telefone} onChange={(event) => setTelefone(formatPhoneBR(event.target.value))} inputMode="tel" autoComplete="tel" placeholder="(85) 9 0000-0000" /></div></div>
            <div className="signup-pin-grid">
              <div className="signup-field"><label htmlFor="signup-pin">Crie seu PIN</label><input id="signup-pin" value={pin} onChange={(event) => setPin(onlyDigits(event.target.value).slice(0, 4))} inputMode="numeric" autoComplete="new-password" type="password" maxLength={4} placeholder="4 dígitos" /></div>
              <div className="signup-field"><label htmlFor="signup-pin-confirm">Repita o PIN</label><input id="signup-pin-confirm" value={confirmPin} onChange={(event) => setConfirmPin(onlyDigits(event.target.value).slice(0, 4))} inputMode="numeric" autoComplete="new-password" type="password" maxLength={4} placeholder="4 dígitos" /></div>
            </div>
            <details className="signup-birthday">
              <summary><span>🎁</span><div><strong>Quer uma surpresa no aniversário?</strong><small>Opcional — não interfere nos seus 200 pontos.</small></div><b aria-hidden="true">+</b></summary>
              <div className="signup-birthday-content">
                <div className="signup-field"><label htmlFor="signup-birthday">Data de nascimento</label><input id="signup-birthday" type="date" value={dataNascimento} max={new Date().toISOString().slice(0, 10)} onChange={(event) => { setDataNascimento(event.target.value); if (!event.target.value) setAceitaAniversario(false); }} /></div>
                <label className="signup-consent"><input type="checkbox" checked={aceitaAniversario} disabled={!dataNascimento} onChange={(event) => setAceitaAniversario(event.target.checked)} /><span>Aceito receber pelo WhatsApp uma surpresa uma semana antes e um lembrete no dia do meu aniversário. Posso cancelar quando quiser.</span></label>
                <p>Sem propaganda toda hora. Essa autorização vale apenas para a campanha de aniversário.</p>
              </div>
            </details>
            <WhatsappOtpVerification telefone={telefoneDigits} proposito="cadastro" onVerified={setWhatsappVerificado} />
            <button type="submit" disabled={loading || !whatsappVerificado} className="signup-submit"><span>{loading ? 'Criando seu clube...' : 'Quero meus 200 pontos'}</span><b aria-hidden="true">→</b></button>
            <p className="signup-rule">A entrega grátis vale para pedidos diretos, conforme disponibilidade e área atendida, e pode ser resgatada uma vez a cada 30 dias.</p>
            <div className="signup-links"><Link href="/">Voltar ao início</Link><Link href="/resgate">Já sou cliente →</Link></div>
          </form>
        </div>
      </section>
    </main>
  );
}
