'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { fetchAdmin } from '@/lib/adminFetch';
import { AdminAccessContext } from '../adminAccessContext';
import styles from './whatsapp.module.css';

type Status = 'disconnected' | 'connecting' | 'qr' | 'connected' | 'disconnecting' | 'error';
type Snapshot = { status: Status; qr: string | null; qr_expires_at: string | null };
type View =
  | { kind: 'loading' }
  | { kind: 'auth'; message: string }
  | { kind: 'unavailable'; message: string }
  | { kind: 'ready'; snapshot: Snapshot };

const POLL_MS = 3000;
const ENDPOINT = '/api/admin/whatsapp/conexao';

const LABELS: Record<Status, { title: string; detail: string; tone: 'off' | 'wait' | 'on' | 'bad' }> = {
  disconnected: { title: 'Desconectado', detail: 'Nenhum aparelho vinculado. Clique em Conectar para gerar o QR.', tone: 'off' },
  connecting: { title: 'Conectando…', detail: 'Aguardando o serviço preparar o QR ou concluir o vínculo.', tone: 'wait' },
  qr: { title: 'Escaneie o QR', detail: 'Use o celular do número dedicado.', tone: 'wait' },
  connected: { title: 'Conectado', detail: 'O número dedicado está vinculado. Nenhuma mensagem é enviada por esta tela.', tone: 'on' },
  disconnecting: { title: 'Desconectando…', detail: 'Desvinculando o aparelho no WhatsApp.', tone: 'wait' },
  error: { title: 'Erro na sessão', detail: 'O serviço relatou erro. Consulte o terminal do serviço antes de tentar de novo.', tone: 'bad' },
};

function secondsLeft(expiresAt: string | null, now: number) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
}

export default function WhatsappConexaoPage() {
  const papel = useContext(AdminAccessContext);
  const isSuperadmin = papel === 'superadmin';
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const inFlight = useRef(false);
  const generation = useRef(0);
  // Invalida respostas em andamento (tela escondida, saída ou comando novo).
  const invalidate = useCallback(() => { generation.current += 1; }, []);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const ticket = ++generation.current;
    try {
      const response = await fetchAdmin(ENDPOINT, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (ticket !== generation.current) return; // resposta antiga, descartada
      if (response.status === 401 || response.status === 403) {
        setView({ kind: 'auth', message: response.status === 401 ? 'Sua sessão expirou. Saia e entre de novo no painel.' : 'Seu perfil não tem permissão para esta tela.' });
      } else if (!response.ok || !payload?.status) {
        setView({ kind: 'unavailable', message: payload?.error || 'Serviço WhatsApp indisponível.' });
      } else {
        setView({ kind: 'ready', snapshot: payload as Snapshot });
      }
    } catch {
      if (ticket === generation.current) setView({ kind: 'unavailable', message: 'Sem resposta do servidor. Verifique a internet.' });
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Consulta só com a tela visível; ao esconder, o QR sai da memória da página.
  useEffect(() => {
    if (!isSuperadmin) return;
    let timer: number | null = null;
    const start = () => {
      if (timer !== null) return;
      void refresh();
      timer = window.setInterval(() => { void refresh(); }, POLL_MS);
    };
    const stop = () => {
      if (timer !== null) { window.clearInterval(timer); timer = null; }
      invalidate();
      setView({ kind: 'loading' });
    };
    const onVisibility = () => (document.visibilityState === 'visible' ? start() : stop());
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (timer !== null) window.clearInterval(timer);
      invalidate();
    };
  }, [isSuperadmin, refresh, invalidate]);

  // Relógio do contador do QR.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function send(action: 'connect' | 'disconnect') {
    setBusy(true);
    setNotice('');
    setConfirmDisconnect(false);
    try {
      const response = await fetchAdmin(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) setNotice(payload?.error || 'Não foi possível concluir o comando.');
    } catch {
      setNotice('Sem resposta do servidor. O comando pode ou não ter sido recebido; confira o estado abaixo antes de repetir.');
    } finally {
      // Sempre reconsultar antes de liberar outro clique.
      invalidate();
      inFlight.current = false;
      await refresh();
      setBusy(false);
    }
  }

  if (!isSuperadmin) {
    return <section className="admin-notice"><strong>Exclusivo do superadmin</strong><span>A conexão do WhatsApp só pode ser consultada e alterada pelo superadmin.</span></section>;
  }

  const snapshot = view.kind === 'ready' ? view.snapshot : null;
  const status = snapshot?.status;
  const remaining = secondsLeft(snapshot?.qr_expires_at ?? null, now);
  const qrVisible = status === 'qr' && Boolean(snapshot?.qr) && remaining > 0;
  const label = status ? LABELS[status] : null;
  const canConnect = !busy && (status === 'disconnected' || status === 'error');
  const canDisconnect = !busy && (status === 'connected' || status === 'qr' || status === 'connecting' || status === 'error');

  return <div className={styles.page}>
    <section className="admin-notice">
      <strong>Piloto local · integração não oficial</strong>
      <span>Use somente o número dedicado do restaurante, nunca um WhatsApp pessoal. O WhatsApp pode bloquear ou desconectar o número. Esta tela não envia mensagens.</span>
    </section>

    {view.kind === 'loading' && <section className={styles.card}><p className={styles.muted}>Consultando o serviço…</p></section>}

    {view.kind === 'auth' && <section className={`${styles.card} ${styles.unavailable}`} role="alert">
      <span className={`${styles.badge} ${styles.bad}`}>Acesso</span>
      <h2>Não foi possível confirmar seu acesso</h2>
      <p>{view.message}</p>
    </section>}

    {view.kind === 'unavailable' &&<section className={`${styles.card} ${styles.unavailable}`} role="alert">
      <span className={`${styles.badge} ${styles.bad}`}>Serviço indisponível</span>
      <h2>Não foi possível falar com o serviço do WhatsApp</h2>
      <p>{view.message}</p>
      <ul>
        <li>O serviço roda neste computador. Confira se o terminal dele está aberto e mostrando “Controle WhatsApp local pronto”.</li>
        <li>Confira se o site local está configurado para o serviço (variáveis do README).</li>
        <li>A tela tenta de novo sozinha a cada 3 segundos.</li>
      </ul>
    </section>}

    {snapshot && label && <section className={styles.card} aria-live="polite">
      <div className={styles.statusRow}>
        <span className={`${styles.badge} ${styles[label.tone]}`}>{label.title}</span>
        <span className={styles.muted}>Atualiza a cada 3 s enquanto esta tela estiver aberta</span>
      </div>
      <p>{label.detail}</p>

      {status === 'qr' && <div className={styles.qrArea}>
        {qrVisible ? <>
          <div className={styles.qrBox}><QRCodeSVG value={snapshot.qr as string} size={264} marginSize={2} level="L" /></div>
          <div className={styles.qrHelp}>
            <strong>No celular do número dedicado:</strong>
            <ol>
              <li>Abra o WhatsApp.</li>
              <li>Toque em <b>Configurações</b> (ou nos três pontinhos) → <b>Aparelhos conectados</b>.</li>
              <li>Toque em <b>Conectar um aparelho</b> e aponte para este QR.</li>
            </ol>
            <p className={styles.countdown}>Expira em {remaining} s. Um novo QR aparece sozinho.</p>
            <p className={styles.muted}>Não fotografe nem compartilhe este QR.</p>
          </div>
        </> : <p className={styles.muted}>QR expirado. Aguardando um novo…</p>}
      </div>}

      <div className={styles.actions}>
        <button type="button" className={styles.primary} disabled={!canConnect} onClick={() => send('connect')}>{busy ? 'Aguarde…' : 'Conectar'}</button>
        {!confirmDisconnect
          ? <button type="button" className={styles.danger} disabled={!canDisconnect} onClick={() => setConfirmDisconnect(true)}>Desconectar</button>
          : <span className={styles.confirm}>
              <span>Desvincular o número deste sistema?</span>
              <button type="button" className={styles.danger} disabled={busy} onClick={() => send('disconnect')}>Sim, desconectar</button>
              <button type="button" className={styles.ghost} onClick={() => setConfirmDisconnect(false)}>Cancelar</button>
            </span>}
      </div>
    </section>}

    {notice && <section className="admin-notice error" role="alert"><span>{notice}</span></section>}

    <section className={styles.card}>
      <h2>Se precisar revogar pelo celular</h2>
      <p className={styles.muted}>No número dedicado: WhatsApp → Aparelhos conectados → toque no aparelho do Clube → Desconectar. Depois clique em Desconectar aqui para limpar a sessão salva.</p>
    </section>
  </div>;
}
