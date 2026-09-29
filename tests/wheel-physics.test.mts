import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAngle, planStop, releaseVelocity, rotationAt, sectorAtRotation } from '../src/lib/wheelPhysics.ts';

test('a fatia sob o ponteiro acompanha a rotação da roda', () => {
  assert.equal(sectorAtRotation(0, 6), 0);
  assert.equal(sectorAtRotation(-30, 6), 0);
  assert.equal(sectorAtRotation(-90, 6), 1);
  assert.equal(sectorAtRotation(330, 6), 0);
  assert.equal(sectorAtRotation(270, 6), 1);
  assert.equal(sectorAtRotation(-1830, 6), 0);
});

test('a roda sempre para na fatia sorteada, qualquer força, sentido ou posição', () => {
  const rotations = [0, 17.3, -250, 3600.5, -7201];
  const velocities = [150, 540, 1000, 1800, -300, -1500];
  const offsets = [-0.45, -0.2, 0, 0.3, 0.45];
  for (const rotation of rotations) for (const velocity of velocities) for (const offset of offsets) {
    for (let target = 0; target < 6; target++) {
      const plan = planStop({ rotation, velocity, targetSector: target, sectors: 6, offset });
      const final = rotationAt(plan, plan.duration);
      assert.equal(sectorAtRotation(final, 6), target, `rot=${rotation} vel=${velocity} off=${offset} alvo=${target}`);
      assert.equal(Math.sign(plan.distance), Math.sign(velocity), 'mantém o sentido do giro');
      assert.ok(Math.abs(plan.distance) >= 720, 'dá pelo menos duas voltas');
      assert.ok(plan.duration >= 3500 && plan.duration <= 9000);
    }
  }
});

test('a parada começa na velocidade do giro, sem tranco', () => {
  const plan = planStop({ rotation: 100, velocity: 900, targetSector: 3, sectors: 6 });
  const startSpeed = ((rotationAt(plan, 10) - rotationAt(plan, 0)) / 10) * 1000;
  assert.ok(Math.abs(startSpeed - 900) < 30, `velocidade inicial ${startSpeed}`);
});

test('o fim é lento para criar suspense', () => {
  const plan = planStop({ rotation: 0, velocity: 1200, targetSector: 2, sectors: 6 });
  const lastSecond = Math.abs(rotationAt(plan, plan.duration) - rotationAt(plan, plan.duration - 1000));
  assert.ok(lastSecond < 30, `último segundo andou ${lastSecond} graus`);
});

test('a velocidade de soltura vem dos últimos 100 ms do dedo', () => {
  const samples = [
    { t: 0, rotation: 0 }, { t: 50, rotation: 5 },
    { t: 200, rotation: 10 }, { t: 250, rotation: 40 }, { t: 300, rotation: 100 },
  ];
  // Janela de 100 ms: de t=200 (10°) a t=300 (100°) = 90° em 0,1 s.
  assert.equal(releaseVelocity(samples), 900);
  assert.equal(releaseVelocity([{ t: 0, rotation: 0 }]), 0);
  assert.equal(releaseVelocity([{ t: 0, rotation: 0 }, { t: 5, rotation: 40 }]), 0);
});

test('entradas inválidas são recusadas e ângulos normalizados', () => {
  assert.throws(() => planStop({ rotation: 0, velocity: 500, targetSector: 6, sectors: 6 }));
  assert.throws(() => planStop({ rotation: Number.NaN, velocity: 500, targetSector: 1, sectors: 6 }));
  assert.equal(normalizeAngle(-30), 330);
  assert.equal(normalizeAngle(725), 5);
});
