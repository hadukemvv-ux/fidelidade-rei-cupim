import assert from 'node:assert/strict';
import test from 'node:test';
import { prizeNotes, prizePhoto } from '../src/lib/prizeVisuals.ts';

test('foto e aviso de cerveja seguem o tipo, mesmo com o prêmio renomeado', () => {
  const renomeado = { nome: 'Gelada da Casa', tipo: 'saideira' };
  assert.equal(prizePhoto(renomeado), '/roleta/premios/saideira.webp');
  assert.match(prizeNotes(renomeado)[0], /1 unidade da mesma cerveja/);
  assert.match(prizeNotes({ nome: 'Dose dupla', tipo: 'expulsadeira' })[0], /2 unidades da mesma cerveja/);
  assert.ok(prizeNotes(renomeado).some((note) => /menores de 18 anos/.test(note)));
});

test('nome que lembra cerveja não engana quando o tipo diz outra coisa', () => {
  const desconto = { nome: 'Saideira de 10%', tipo: 'desconto_presencial_10' };
  assert.equal(prizePhoto(desconto), null);
  assert.deepEqual(prizeNotes(desconto), []);
});

test('foto enviada pelo painel tem prioridade sobre a foto padrão', () => {
  const url = 'https://asjoubgoccbvftyggunz.supabase.co/storage/v1/object/public/premios/roleta/1/a.webp';
  assert.equal(prizePhoto({ nome: 'Saideira', tipo: 'saideira', imagem_url: url }), url);
});

test('sem tipo (resposta antiga), usa o nome como reserva', () => {
  assert.equal(prizePhoto({ nome: 'Expulsadeira' }), '/roleta/premios/expulsadeira.webp');
  assert.equal(prizePhoto({ nome: 'Sobremesa do Rei' }), '/roleta/premios/sobremesa.webp');
  assert.match(prizeNotes({ nome: 'Saideira' })[0], /1 unidade/);
  assert.equal(prizePhoto({ nome: 'Prêmio de teste' }), null);
});
