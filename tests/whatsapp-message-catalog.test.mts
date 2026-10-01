import test from 'node:test';
import assert from 'node:assert/strict';
import { messageCatalogSummary } from '../src/lib/whatsappMessageCatalog.ts';

test('modelos são rascunhos transacionais, sem campanha ou gatilho ligado', () => {
  const models = messageCatalogSummary();
  assert.equal(models.length, 3);
  assert.ok(models.every(m => m.automaticEnabled === false));
  assert.ok(models.every(m => !/promo|marketing/.test(m.purpose)));
  assert.ok(models.every(m => m.requirements.length > 0));
});
test('aviso de cadastro exige telefone comprovado; prêmio imediato não exige concluir cadastro', () => {
  const model = messageCatalogSummary().find(m => m.id === 'concluir_cadastro')!;
  assert.ok(model.requirements.includes('Telefone comprovado'));
  assert.ok(model.requirements.includes('Benefício futuro reservado'));
  assert.match(model.candidateEvent, /futuro/);
});
test('aviso do garçom não confirma entrega nem dá baixa por mensagem', () => {
  const model = messageCatalogSummary().find(m => m.id === 'escolher_item_premio')!;
  assert.match(model.draft, /somente depois de entregar/);
  assert.ok(model.requirements.includes('Operador ativo e responsável pela pendência'));
});
test('alterar uma cópia da lista de requisitos não altera o catálogo', () => {
  messageCatalogSummary()[0].requirements.length = 0;
  assert.ok(messageCatalogSummary()[0].requirements.length > 0);
});
