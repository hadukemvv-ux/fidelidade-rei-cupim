import { inspectOtpClock } from './otp-clock-inspection.mjs';

const flags = process.argv.slice(2);
if (flags.length !== 2 || !flags.includes('--inspect') || !flags.includes('--worker-stopped')) {
  process.stderr.write('Inspeção desligada. Pare o worker e use --inspect --worker-stopped com ambiente privado.\n');
  process.exitCode = 1;
} else {
  try {
    const report = await inspectOtpClock({
      directory: process.env.WHATSAPP_QR_SESSION_DIR,
      keyHex: process.env.WHATSAPP_QR_SESSION_KEY,
    });
    process.stdout.write(JSON.stringify(report) + '\n');
    process.exitCode = report.status === 'ok' ? 0 : 2;
  } catch {
    process.stderr.write('Não foi possível inspecionar. Confira worker parado, configuração privada, chave e sessão; não apague arquivos.\n');
    process.exitCode = 1;
  }
}
