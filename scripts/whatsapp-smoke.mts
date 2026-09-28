import { botConfig, sendBotSmokeTest } from '../src/lib/whatsappBotCore.ts';

// Teste manual único; não usar como fila, cron ou endpoint público.
if (process.argv[2] !== '--send') throw new Error('Use --send somente após autorizar o teste e configurar os Secrets.');
const recipient = process.env.WHATSAPP_BOT_SMOKE_RECIPIENT;
if (!recipient) throw new Error('Configure o destinatário de teste no ambiente, não na linha de comando.');
try {
  const result = await sendBotSmokeTest(botConfig(process.env), recipient);
  console.log(`Teste aceito pelo provedor. ID: ${result.messageId}. A entrega ainda deve ser conferida no celular.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Falha no teste.');
  process.exitCode = 1;
}
