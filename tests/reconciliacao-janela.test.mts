import assert from 'node:assert/strict';
import test from 'node:test';
import { diasDeConsultaParaPendencias } from '../src/lib/reconciliacaoJanela.ts';

const agora = new Date('2026-09-22T12:00:00.000Z');

test('mantém a janela mínima para pendências recentes', () => {
  assert.equal(diasDeConsultaParaPendencias(['2026-09-22T11:00:00.000Z'], agora), 3);
});

test('aumenta a janela quando o gestor fica uma semana sem abrir o sistema', () => {
  assert.equal(diasDeConsultaParaPendencias(['2026-09-15T12:00:00.000Z'], agora), 8);
});

test('impõe teto de 90 dias para manter o cron de reconciliação previsível', () => {
  assert.equal(diasDeConsultaParaPendencias(['2026-01-01T12:00:00.000Z'], agora), 90);
});
