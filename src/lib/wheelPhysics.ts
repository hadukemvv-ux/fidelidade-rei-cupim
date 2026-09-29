/**
 * Física visual da roleta. O prêmio é sorteado no servidor; estas funções só
 * decidem como a roda gira e desacelera até parar na fatia já sorteada.
 * Ângulos em graus, rotação positiva = sentido horário, ponteiro no topo.
 */

export type AngleSample = { t: number; rotation: number };
export type StopPlan = { from: number; distance: number; duration: number; power: number };

export function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

/** Fatia sob o ponteiro (topo) para uma rotação da roda. */
export function sectorAtRotation(rotation: number, sectors: number) {
  const size = 360 / sectors;
  return Math.floor(normalizeAngle(-rotation) / size) % sectors;
}

/** Velocidade angular (graus/s) dos últimos movimentos do dedo. */
export function releaseVelocity(samples: AngleSample[], windowMs = 100) {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  const first = samples.find((sample) => last.t - sample.t <= windowMs) ?? samples[0];
  const elapsed = last.t - first.t;
  if (elapsed < 16) return 0;
  return ((last.rotation - first.rotation) / elapsed) * 1000;
}

/**
 * Planeja a parada: continua no mesmo sentido e na mesma velocidade do giro,
 * dá pelo menos `minTurns` voltas e termina dentro da fatia `targetSector`,
 * deslocado do centro por `offset` (fração da fatia, entre -0,5 e 0,5).
 * A curva 1 - (1 - x)^power começa na velocidade atual e se arrasta no fim.
 */
export function planStop(input: {
  rotation: number;
  velocity: number;
  targetSector: number;
  sectors: number;
  offset?: number;
  minTurns?: number;
  idealDurationMs?: number;
  minDurationMs?: number;
  maxDurationMs?: number;
  power?: number;
}): StopPlan {
  const {
    rotation, velocity, targetSector, sectors,
    offset = 0, minTurns = 2, idealDurationMs = 6000,
    minDurationMs = 3500, maxDurationMs = 9000, power = 4,
  } = input;
  if (!Number.isInteger(targetSector) || targetSector < 0 || targetSector >= sectors) throw new Error('Fatia inválida.');
  if (!Number.isFinite(rotation) || !Number.isFinite(velocity)) throw new Error('Movimento inválido.');

  const size = 360 / sectors;
  const safeOffset = Math.max(-0.45, Math.min(0.45, offset));
  const targetAngle = targetSector * size + size / 2 + safeOffset * size;
  const direction = velocity < 0 ? -1 : 1;
  const speed = Math.max(Math.abs(velocity), 120);
  const base = Math.max(minTurns * 360, (speed * idealDurationMs) / 1000 / power);

  const candidate = rotation + direction * base;
  const final = direction > 0
    ? candidate + normalizeAngle(-targetAngle - candidate)
    : candidate - normalizeAngle(candidate + targetAngle);
  const distance = final - rotation;
  const duration = Math.min(maxDurationMs, Math.max(minDurationMs, (power * Math.abs(distance) * 1000) / speed));
  return { from: rotation, distance, duration, power };
}

export function rotationAt(plan: StopPlan, elapsedMs: number) {
  const progress = Math.min(1, Math.max(0, elapsedMs / plan.duration));
  return plan.from + plan.distance * (1 - Math.pow(1 - progress, plan.power));
}
