import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { botConfig, extractBotReplies, sendBotSmokeTest, validMetaSignature } from '../src/lib/whatsappBotCore.ts';
import { receiveBotWebhook, verifyBotWebhook } from '../src/lib/whatsappBotWebhook.ts';
import { confirmedDelivery, deliveryChoices, deliveryOverdue } from '../src/lib/prizeDeliveryRules.ts';

const config = { ...botConfig({}), mode: 'test' as const, phoneNumberId: '12345', apiVersion: 'v99.0', accessToken: 'test-token', appSecret: 'test-app-secret', verifyToken: 'test-verify-token', identifierSecret: 'test-hash-secret', testRecipients: '85988887777' };
const choice = `cc:${'a'.repeat(32)}`;
function payload(from = '5585988887777', selected = choice) {
  return { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: config.phoneNumberId }, contacts: [{ profile: { name: 'Nome privado' } }], messages: [{ id: 'wamid.test', from, type: 'interactive', interactive: { type: 'list_reply', list_reply: { id: selected, title: 'Descrição privada' } } }] } }] }] };
}
function request(data: unknown, signatureValid = true) {
  const body = JSON.stringify(data);
  const signature = createHmac('sha256', config.appSecret).update(body).digest('hex');
  return new Request('https://example.test/api/whatsapp/webhook', { method: 'POST', body, headers: { 'x-hub-signature-256': `sha256=${signatureValid ? signature : '0'.repeat(64)}` } });
}

test('bot fica desligado por padrão e não aceita modo comercial', () => {
  assert.equal(botConfig({}).mode, 'disabled');
  assert.equal(botConfig({ WHATSAPP_BOT_MODE: 'production' }).mode, 'disabled');
});
test('valida assinatura sobre bytes originais e rejeita adulteração', () => {
  const body = Buffer.from('texto');
  const signature = `sha256=${createHmac('sha256', config.appSecret).update(body).digest('hex')}`;
  assert.equal(validMetaSignature(body, signature, config.appSecret), true);
  assert.equal(validMetaSignature(Buffer.from('outro'), signature, config.appSecret), false);
  assert.equal(validMetaSignature(body, 'sha256=curto', config.appSecret), false);
});
test('handshake exige token e não retorna challenge arbitrário', () => {
  assert.equal(verifyBotWebhook(new Request('https://example.test?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=123'), config).status, 200);
  assert.equal(verifyBotWebhook(new Request('https://example.test?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=123'), config).status, 403);
});
test('recebe seleção opaca sem persistir número, nome ou título', () => {
  const result = extractBotReplies(payload(), config);
  assert.equal(result.length, 1);
  assert.deepEqual(Object.keys(result[0]), ['message_id', 'sender_hash', 'choice_hash']);
  assert.equal(JSON.stringify(result).includes('5585988887777'), false);
  assert.equal(result[0].choice_hash.length, 64);
  assert.deepEqual(extractBotReplies(payload('5585999999999'), config), []);
  assert.deepEqual(extractBotReplies(payload('5585988887777', 'produto-arbitrario'), config), []);
});
test('ignora texto livre e remetente de outro canal; deduplica lote', () => {
  const data = payload();
  const value = data.entry[0].changes[0].value;
  value.messages.push(value.messages[0]);
  assert.equal(extractBotReplies(data, config).length, 1);
  value.messages[0].type = 'text';
  assert.deepEqual(extractBotReplies(data, config), []);
  value.metadata.phone_number_id = 'outro';
  assert.deepEqual(extractBotReplies(data, config), []);
});
test('webhook só confirma recebimento após salvar; falha de inbox pede retentativa', async () => {
  let writes = 0;
  assert.equal((await receiveBotWebhook(request(payload()), config, async () => { writes++; })).status, 200);
  assert.equal(writes, 1);
  assert.equal((await receiveBotWebhook(request(payload()), config, async () => { throw new Error('offline'); })).status, 503);
  assert.equal((await receiveBotWebhook(request(payload(), false), config, async () => { writes++; })).status, 401);
  assert.equal(writes, 1);
});
test('webhook desabilitado e corpo excessivo não chegam à persistência', async () => {
  const persist = async () => { throw new Error('Não deve executar'); };
  assert.equal((await receiveBotWebhook(request(payload()), botConfig({}), persist)).status, 503);
  const large = new Request('https://example.test', { method: 'POST', body: 'a'.repeat(256 * 1024 + 1) });
  assert.equal((await receiveBotWebhook(large, config, persist)).status, 413);
});
test('smoke é um único envio fixo e não vaza erro nem retenta resultado incerto', async () => {
  let calls = 0;
  const transport: typeof fetch = async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.template.name, 'hello_world');
    assert.equal(body.to, '5585988887777');
    return Response.json({ messages: [{ id: 'wamid.accepted' }] });
  };
  assert.equal((await sendBotSmokeTest(config, '85988887777', transport)).accepted, true);
  await assert.rejects(sendBotSmokeTest(config, '85999999999', transport), /fora do teste/);
  await assert.rejects(sendBotSmokeTest({ ...config, mode: 'disabled' }, '85988887777', transport), /desligado/);
  assert.equal(calls, 1);
  await assert.rejects(sendBotSmokeTest(config, '85988887777', async () => { calls++; throw new Error('token secreto'); }), /Resultado do envio desconhecido/);
  assert.equal(calls, 2);
});

const products = [
  { id: 'cerveja-a', nome: 'Cerveja A 600 ml', unidade: 'UN', categoria: 'cerveja' as const, ativo: true },
  { id: 'cerveja-b', nome: 'Cerveja B 600 ml', unidade: 'UN', categoria: 'cerveja' as const, ativo: true },
  { id: 'brownie', nome: 'Brownie', unidade: 'UN', categoria: 'sobremesa' as const, ativo: true },
];
test('prêmio genérico permite cliente escolher entre cervejas consumidas; quantidade é do prêmio', () => {
  const options = deliveryChoices('expulsadeira', products, ['cerveja-a', 'cerveja-b']);
  assert.equal(options.length, 2);
  assert.equal(confirmedDelivery('expulsadeira', 'cerveja-b', options).quantidade, 2);
  assert.equal(confirmedDelivery('saideira', 'cerveja-b', options).quantidade, 1);
  assert.throws(() => confirmedDelivery('saideira', 'cerveja-b', deliveryChoices('saideira', products, ['cerveja-a'])));
  assert.throws(() => confirmedDelivery('sobremesa', 'cerveja-a', products));
  assert.equal(deliveryChoices('sobremesa', products, []).length, 1);
});
test('pendência em 72 horas vence para alerta, não vira uma entrega', () => {
  assert.equal(deliveryOverdue('2026-09-25T10:00:00Z', new Date('2026-09-28T09:59:59Z')), false);
  assert.equal(deliveryOverdue('2026-09-25T10:00:00Z', new Date('2026-09-28T10:00:00Z')), true);
});
