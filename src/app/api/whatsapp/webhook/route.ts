import { botConfig } from '@/lib/whatsappBotCore';
import { receiveBotWebhook, verifyBotWebhook } from '@/lib/whatsappBotWebhook';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { bloquearSeContencaoAtiva } from '@/lib/operationalContainment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return verifyBotWebhook(request, botConfig(process.env));
}

export async function POST(request: Request) {
  const blocked = await bloquearSeContencaoAtiva();
  if (blocked) return blocked;
  return receiveBotWebhook(request, botConfig(process.env), async (replies) => {
    // A migração de inbox ainda precisa ser revisada/aplicada antes de habilitar o canal.
    const { error } = await supabaseAdmin.rpc('receber_respostas_whatsapp_bot', { p_respostas: replies });
    if (error) throw new Error('Inbox indisponível.');
  });
}
