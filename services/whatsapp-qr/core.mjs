// Experimental transport only: no OTP, sending, business database or chat store.
export const TEST_DURATION_MS = 5 * 60 * 1000;

export function canConnect(args, interactive) {
  const expected = ['--connect', '--test-only', '--dedicated-number'];
  return interactive && args.length === expected.length &&
    expected.every((flag) => args.includes(flag));
}

export function createMemoryAuthState(initCredentials) {
  const entries = new Map();
  const state = {
    creds: initCredentials(),
    keys: {
      async get(type, ids) {
        // Null prototype: even protocol-provided IDs cannot alter Object.prototype.
        const result = Object.create(null);
        for (const id of ids) {
          const value = entries.get(type)?.get(id);
          if (value !== undefined) result[id] = value;
        }
        return result;
      },
      async set(data) {
        for (const [type, values] of Object.entries(data)) {
          let bucket = entries.get(type);
          if (!bucket) entries.set(type, bucket = new Map());
          for (const [id, value] of Object.entries(values)) {
            if (value == null) bucket.delete(id);
            else bucket.set(id, value);
          }
        }
      },
    },
  };
  return {
    state,
    update(partial) { Object.assign(state.creds, partial); },
    clear() {
      entries.clear();
      for (const key of Object.keys(state.creds)) delete state.creds[key];
    },
  };
}

export function privateSocketOptions(auth, logger) {
  return {
    auth,
    logger,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    shouldIgnoreJid: () => true,
    getMessage: async () => undefined,
    connectTimeoutMs: 30_000,
    qrTimeout: 45_000,
    // Do not register messages.upsert, history/contact/group handlers or auto-replies.
  };
}

export function disconnectDecision(statusCode, restartRequired, restartCount) {
  // A single restart after QR is required by the pairing protocol, not a send retry.
  return statusCode === restartRequired && restartCount === 0 ? 'restart' : 'stop';
}
