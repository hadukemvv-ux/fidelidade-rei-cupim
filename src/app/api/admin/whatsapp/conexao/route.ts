import { requireOperationalActor } from '@/lib/operationalAuth';
import { bloquearSeContencaoAtiva } from '@/lib/operationalContainment';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { qrControlConfig, qrControlResponse, requestQrControl } from '@/lib/whatsappQrControl';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const actor = await requireOperationalActor(request, 'superadmin');
  if (actor instanceof Response) { actor.headers.set('Cache-Control', 'no-store'); return actor; }
  return requestQrControl(process.env, 'status');
}

export async function POST(request: Request) {
  const actor = await requireOperationalActor(request, 'superadmin');
  if (actor instanceof Response) { actor.headers.set('Cache-Control', 'no-store'); return actor; }
  if (!qrControlConfig(process.env)) return qrControlResponse({ error: 'Conexão WhatsApp ainda não configurada.' }, 503);
  // Authenticate before parsing; cap the stream instead of trusting Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return qrControlResponse({ error: 'Comando inválido.' }, 400);
  let body = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      body += new TextDecoder().decode(value);
      if (body.length > 128) { await reader.cancel(); return qrControlResponse({ error: 'Comando inválido.' }, 400); }
    }
  } finally { reader.releaseLock(); }
  let action;
  try { action = JSON.parse(body).action; } catch { return qrControlResponse({ error: 'Comando inválido.' }, 400); }
  if (action !== 'connect' && action !== 'disconnect') return qrControlResponse({ error: 'Comando inválido.' }, 400);
  if (action === 'connect') {
    const blocked = await bloquearSeContencaoAtiva();
    if (blocked) { blocked.headers.set('Cache-Control', 'no-store'); return blocked; }
  }
  // Intent is durable before network action; a timeout is not success or a retry.
  const { error } = await supabaseAdmin.from('administracao_eventos').insert({
    entidade: 'configuracao', entidade_id: 'whatsapp_qr', acao: 'whatsapp_conexao_solicitada',
    actor_user_id: actor.userId, actor_email: actor.email, detalhes: { acao: action },
  });
  if (error) return qrControlResponse({ error: 'Não foi possível registrar a operação.' }, 503);
  return requestQrControl(process.env, action);
}
