'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import WhatsappOtpVerification from '@/components/WhatsappOtpVerification';
import { brandFontClass } from '@/components/brandFonts';

/** "DD/MM/AAAA" completo e real (não futuro) vira "AAAA-MM-DD"; qualquer outra coisa vira ''. */
function birthdayToIso(text: string) {
  const digits = text.replace(/\D/g, '');
  if (digits.length !== 8) return '';
  const day = Number(digits.slice(0, 2)), month = Number(digits.slice(2, 4)), year = Number(digits.slice(4));
  const date = new Date(Date.UTC(year, month - 1, day));
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!real || year < 1900 || date.getTime() > Date.now()) return '';
  return `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
}

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
  // A data é digitada (DD/MM/AAAA): o calendário do celular é lento para anos antigos.
  const [nascimentoTexto, setNascimentoTexto] = useState('');
  const nascimentoInvalido = onlyDigits(nascimentoTexto).length === 8 && !dataNascimento;
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
  function changeBirthday(value: string) {
    const digits = onlyDigits(value).slice(0, 8);
    setNascimentoTexto([digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/'));
    const iso = birthdayToIso(digits);
    setDataNascimento(iso);
    // Informar a data é o pedido da surpresa: a autorização acompanha, e a pessoa ainda pode desmarcar.
    setAceitaAniversario(Boolean(iso));
  }

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

    if (nascimentoTexto && !dataNascimento)
      return setFeedback({ type: 'error', text: 'Confira a data de nascimento (DD/MM/AAAA) ou deixe em branco.' });

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
          // Sem autorização não há motivo para guardar a data.
          data_nascimento: (aceitaAniversario && dataNascimento) || null,
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
    <main className={`signup-page ${brandFontClass}`}>
      <section className="signup-promise" aria-labelledby="signup-title">
        <Image src="/images/home/cupim-trinchado.webp" alt="Cupim assado na brasa" fill priority sizes="(max-width: 899px) 100vw, 48vw" />
        <div className="signup-promise-shade" />
        <Link href="/" className="signup-brand" aria-label="Voltar ao início"><Image src="/logo.png" alt="" width={62} height={62} /><span>O Rei do Cupim</span></Link>
        <div className="signup-promise-copy">
          <h1 id="signup-title">Cadastre-se hoje.<br /><em>A primeira entrega é por nossa conta.</em></h1>
          <p>Você começa com 200 pontos.</p>
          <div className="signup-benefits" aria-label="Benefícios do clube">
            <div><strong>+</strong><span>pontos e cashback</span></div>
            <div><strong>🎁</strong><span>surpresa no aniversário</span></div>
          </div>
        </div>
      </section>

      <section className="signup-form-side" aria-label="Cadastro no clube">
        <div className="signup-form-wrap">
          <div className="signup-form-heading"><span>Leva 1 minuto</span><h2>Entre para o clube.</h2></div>
          <p className="signup-have-account">Já tem cadastro? <Link href="/resgate">Entrar na minha conta&nbsp;→</Link></p>
          {feedback && <div className={`signup-feedback ${feedback.type}`} role="status">{feedback.text}</div>}
          <form onSubmit={handleSubmit} className="signup-form">
            <div className="signup-field"><label htmlFor="signup-name">Seu nome</label><input id="signup-name" value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="name" placeholder="Como podemos chamar você?" /></div>
            <div className="signup-field"><label htmlFor="signup-phone">WhatsApp com DDD</label><div className="signup-phone"><span>+55</span><input id="signup-phone" value={telefone} onChange={(event) => setTelefone(formatPhoneBR(event.target.value))} inputMode="tel" autoComplete="tel" placeholder="(85) 9 0000-0000" /></div></div>
            <div className="signup-pin-grid">
              <div className="signup-field"><label htmlFor="signup-pin">Crie seu PIN</label><input id="signup-pin" value={pin} onChange={(event) => setPin(onlyDigits(event.target.value).slice(0, 4))} inputMode="numeric" autoComplete="new-password" type="password" maxLength={4} placeholder="4 dígitos" /></div>
              <div className="signup-field"><label htmlFor="signup-pin-confirm">Repita o PIN</label><input id="signup-pin-confirm" value={confirmPin} onChange={(event) => setConfirmPin(onlyDigits(event.target.value).slice(0, 4))} inputMode="numeric" autoComplete="new-password" type="password" maxLength={4} placeholder="4 dígitos" /></div>
            </div>
            <details className="signup-birthday">
              <summary><span>🎁</span><div><strong>Quer uma surpresa no aniversário?</strong><small>Opcional</small></div><b aria-hidden="true">+</b></summary>
              <div className="signup-birthday-content">
                <div className="signup-field"><label htmlFor="signup-birthday">Data de nascimento</label><input id="signup-birthday" value={nascimentoTexto} onChange={(event) => changeBirthday(event.target.value)} inputMode="numeric" autoComplete="bday" placeholder="DD/MM/AAAA" maxLength={10} aria-invalid={nascimentoInvalido || undefined} />{nascimentoInvalido && <small className="signup-field-error">Confira a data: dia, mês e ano com 4 dígitos.</small>}</div>
                <label className="signup-consent"><input type="checkbox" checked={aceitaAniversario} disabled={!dataNascimento} onChange={(event) => setAceitaAniversario(event.target.checked)} /><span>Aceito receber pelo WhatsApp uma surpresa uma semana antes e um lembrete no dia do meu aniversário. Posso cancelar quando quiser.</span></label>
              </div>
            </details>
            <WhatsappOtpVerification telefone={telefoneDigits} proposito="cadastro" onVerified={setWhatsappVerificado} />
            <button type="submit" disabled={loading || !whatsappVerificado} className="signup-submit"><span>{loading ? 'Criando seu clube...' : 'Quero meus 200 pontos'}</span><b aria-hidden="true">→</b></button>
            <p className="signup-rule">Entrega grátis em pedidos diretos, conforme a área atendida. Um resgate a cada 14 dias.</p>
            <div className="signup-links"><Link href="/">Voltar ao início</Link><Link href="/privacidade">Privacidade</Link></div>
          </form>
        </div>
      </section>
    </main>
  );
}
