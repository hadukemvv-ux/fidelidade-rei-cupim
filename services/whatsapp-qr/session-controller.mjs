// No inbound message handlers. One socket, serialized control and isolated test sends.
export function createSessionController({ makeSocket, store, restartRequired, loggedOut, now = Date.now }) {
  let socket;
  let status = 'disconnected';
  let qr = null;
  let qrExpiresAt = 0;
  let generation = 0;
  let restarts = 0;
  let pending = Promise.resolve();
  let fatal = false;
  const resetQr = () => { qr = null; qrExpiresAt = 0; };
  function failure() {
    fatal = true;
    status = 'error';
    resetQr();
    generation++;
    socket?.end(new Error('Session unavailable'));
    socket = undefined;
  }
  store.setFailureHandler?.(failure);
  function startSocket() {
    const id = ++generation;
    const current = makeSocket(store.state);
    socket = current;
    status = 'connecting';
    current.ev.on('creds.update', (partial) => {
      if (id === generation) void store.update(partial).catch(failure);
    });
    current.ev.on('connection.update', (event) => {
      if (id !== generation) return;
      if (event.qr) { qr = event.qr; qrExpiresAt = now() + 40_000; status = 'qr'; }
      if (event.connection === 'open') { resetQr(); status = 'connected'; restarts = 0; }
      if (event.connection === 'close') {
        resetQr();
        socket = undefined;
        generation++;
        const code = event.lastDisconnect?.error?.output?.statusCode;
        if (code === restartRequired && restarts++ === 0) {
          try { startSocket(); } catch { failure(); }
        } else if (code === loggedOut) {
          status = 'disconnecting';
          pending = pending.then(() => store.clear()).then(() => { status = 'disconnected'; }).catch(failure);
        } else status = 'disconnected';
      }
    });
  }
  function snapshot() {
    if (qr && now() >= qrExpiresAt) { resetQr(); status = 'connecting'; }
    return { status, qr, qr_expires_at: qr ? new Date(qrExpiresAt).toISOString() : null };
  }
  return {
    snapshot,
    async runConnected(action) {
      const run = pending.then(async () => {
        if (fatal || status !== 'connected' || !socket) throw new Error('Session unavailable');
        const current = socket, id = generation;
        const result = await action(current);
        if (id !== generation || current !== socket || status !== 'connected') throw new Error('Session changed');
        return result;
      });
      pending = run.catch(() => {});
      return run;
    },
    async command(action) {
      const run = pending.then(async () => {
        if (fatal) throw new Error('Session unavailable');
        if (action === 'connect') {
          if (!socket) { restarts = 0; startSocket(); }
        } else if (action === 'disconnect') {
          if (store.state.creds.registered && status !== 'connected') throw new Error('Reconnect before unlinking');
          const current = socket;
          generation++;
          status = 'disconnecting'; resetQr();
          try {
            if (store.state.creds.registered && current) {
              let timer;
              try { await Promise.race([current.logout(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Timeout')), 8000); })]); }
              finally { clearTimeout(timer); }
            }
            current?.end(new Error('Session disconnected'));
            socket = undefined;
            await store.clear();
            status = 'disconnected';
          } catch { failure(); throw new Error('Could not confirm unlink'); }
        } else throw new Error('Invalid command');
        return snapshot();
      });
      pending = run.catch(() => {});
      return run;
    },
    async close() {
      await pending;
      generation++;
      resetQr();
      socket?.end(new Error('Service stopped'));
      socket = undefined;
      status = 'disconnected';
      await store.close();
    },
  };
}
