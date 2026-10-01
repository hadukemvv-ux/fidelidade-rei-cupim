import { z } from 'zod';

// Text only. React renders these strings without interpreting HTML.
const hasControl = (value: string, multiline = false) => [...value].some(char => {
  const code = char.charCodeAt(0);
  return (code < 32 || code === 127) && !(multiline && [9, 10, 13].includes(code));
});
const number = (schema: z.ZodNumber) => z.union([z.number(), z.string().regex(/^\d+(?:\.\d+)?$/)]).transform(Number).pipe(schema);
const name = z.string().trim().min(1).max(255).refine(value => !hasControl(value), 'Nome contém caracteres inválidos.');
const description = (limit: number) => z.string().trim().max(limit)
  .refine(value => !hasControl(value, true), 'Descrição contém caracteres inválidos.')
  .transform(value => value || null).nullable().optional();

export const PrizeUpdateSchema = z.object({
  id: number(z.number().int().positive().max(Number.MAX_SAFE_INTEGER)),
  nome: name.optional(),
  descricao_vitoria: description(500),
  emoji: z.string().max(16).optional(),
  probabilidade: number(z.number().int().min(0).max(100000)).optional(),
  ativo: z.boolean().optional(),
  valor: number(z.number().min(0).max(9999999999.99)).optional(),
  participa_roleta: z.boolean().optional(),
  canal_uso: z.enum(['presencial', 'delivery', 'ambos']).optional(),
  custo_estimado: number(z.number().min(0).max(9999999999.99)).optional(),
  expira_em_dias: number(z.number().int().min(1).max(90)).optional(),
  pesos_nivel: z.array(number(z.number().int().min(0).max(100000))).length(6).optional(),
  descricao_operacional: description(1000),
}).strict().refine(value => Object.keys(value).some(key => key !== 'id'), 'Nenhum campo válido para atualizar.');

export type PrizeUpdateStore = {
  commit(input: { prizeId: number; actorId: string; changes: Record<string, unknown> }): Promise<{
    ok: boolean; premio?: Record<string, unknown>; code?: string; motivo?: string;
  }>;
};
const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function updatePrize(request: Request, actor: { userId: string; papel: string }, store: PrizeUpdateStore) {
  if (actor.papel !== 'superadmin') return response({ ok: false, error: 'Sem permissão para editar prêmios.' }, 403);
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return response({ ok: false, error: 'Origem inválida.' }, 403);
  }
  let body: unknown;
  try { body = await request.json(); }
  catch { return response({ ok: false, error: 'Formato JSON inválido.' }, 400); }
  const parsed = PrizeUpdateSchema.safeParse(body);
  if (!parsed.success) return response({ ok: false, error: parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') }, 400);
  const { id, ...changes } = parsed.data;
  try {
    // The RPC rechecks permissions and commits the change and audit together.
    const result = await store.commit({ prizeId: id, actorId: actor.userId, changes });
    if (!result.ok) {
      const statuses: Record<string, number> = { forbidden: 403, not_found: 404, paused: 409, pilot: 409, invalid: 400 };
      const status = statuses[result.code || ''] || 409;
      return response({ ok: false, error: result.motivo || 'Não foi possível editar o prêmio.' }, status);
    }
    return response({ ok: true, data: { premio: result.premio } });
  } catch {
    // A transport timeout may follow a committed transaction: never retry.
    return response({ ok: false, error: 'Não foi possível confirmar a alteração. Atualize o painel antes de tentar novamente.' }, 503);
  }
}
