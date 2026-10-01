import { requireOperationalActor } from '@/lib/operationalAuth';
import { bloquearSeContencaoAtiva } from '@/lib/operationalContainment';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { PRIZE_IMAGE_BUCKET } from '@/lib/prizeImage';
import { uploadPrizeImage } from '@/lib/prizeImageUpload';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await requireOperationalActor(request, 'superadmin');
  if (actor instanceof Response) { actor.headers.set('Cache-Control', 'no-store'); return actor; }
  const blocked = await bloquearSeContencaoAtiva();
  if (blocked) { blocked.headers.set('Cache-Control', 'no-store'); return blocked; }
  const { id } = await context.params;
  const prizeId = /^[1-9]\d*$/.test(id) ? Number(id) : NaN;
  return uploadPrizeImage(request, actor, prizeId, {
    async current(id) {
      const { data, error } = await supabaseAdmin.from('premios_roleta').select('imagem_url').eq('id', id).maybeSingle();
      if (error) throw new Error('Prize unavailable');
      return data;
    },
    async upload(path, image) {
      const { error } = await supabaseAdmin.storage.from(PRIZE_IMAGE_BUCKET).upload(path, image, {
        contentType: 'image/webp', cacheControl: '31536000', upsert: false,
      });
      if (error) throw new Error('Storage unavailable');
    },
    async commit(input) {
      const { data, error } = await supabaseAdmin.rpc('atualizar_imagem_premio', {
        p_premio_id: input.prizeId, p_actor_id: input.actorId,
        p_imagem_url: input.url, p_imagem_anterior: input.previousUrl,
      });
      if (error || !data) throw new Error('Image commit uncertain');
      return data;
    },
  });
}
