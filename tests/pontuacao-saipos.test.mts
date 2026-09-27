import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { getNivelPorGasto } from '../src/lib/fidelidade-rules.ts';
import { calcularGastoMovel90Dias, identificarContaParaPontuacao } from '../src/lib/pontuacaoSaipos.ts';

const conta = {
  id: 7,
  telefone: '85988887777',
  telefone_verificado_em: '2026-09-25T12:00:00.000Z',
  pin_hash: 'scrypt$hash-de-teste',
};

test('identifica somente conta única e verificada pelo telefone completo com DDD', () => {
  assert.deepEqual(
    identificarContaParaPontuacao({ customer: { phone: '+55 (85) 98888-7777', cpf_cnpj: '12345678901' } }, [conta]),
    { status: 'identificada', clienteId: 7 },
  );
  assert.deepEqual(
    identificarContaParaPontuacao({ customer: { phone: '98888-7777' } }, [conta]),
    { status: 'sem_telefone' },
  );
});

test('não usa CPF ou nome para tomar conta de outro participante', () => {
  assert.deepEqual(
    identificarContaParaPontuacao({ customer: { cpf_cnpj: '12345678901', name: 'Vinicius' } }, [conta]),
    { status: 'sem_telefone' },
  );
  assert.deepEqual(
    identificarContaParaPontuacao({ customer: { phone: '85911112222' } }, [conta]),
    { status: 'sem_cadastro' },
  );
});

test('não pontua pré-cadastro, telefone não comprovado ou identidade ambígua', () => {
  assert.deepEqual(
    identificarContaParaPontuacao({ customer_phone: conta.telefone }, [{ ...conta, telefone_verificado_em: null }]),
    { status: 'nao_verificada' },
  );
  assert.deepEqual(
    identificarContaParaPontuacao({ customer_phone: conta.telefone }, [{ ...conta, pin_hash: null }]),
    { status: 'nao_verificada' },
  );
  assert.deepEqual(
    identificarContaParaPontuacao({ customer_phone: conta.telefone }, [{ ...conta, pin_hash: createHash('sha256').update(conta.telefone.slice(0, 4)).digest('hex') }]),
    { status: 'nao_verificada' },
  );
  assert.deepEqual(
    identificarContaParaPontuacao({ customer_phone: conta.telefone }, [conta, { ...conta, id: 8 }]),
    { status: 'ambiguo' },
  );
});

test('janela móvel de 90 dias diminui o nível sem mexer no saldo', () => {
  const compras = [
    { valor: 250, ocorreuEm: '2026-01-01T12:00:00.000Z' },
    { valor: 100.1, ocorreuEm: '2026-03-31T12:00:01.000Z' },
    { valor: 150.25, ocorreuEm: '2026-04-01T12:00:00.000Z' },
  ];
  assert.equal(getNivelPorGasto(calcularGastoMovel90Dias(compras, new Date('2026-04-01T12:00:00.000Z'))).nivel, 'OURO');
  assert.equal(getNivelPorGasto(calcularGastoMovel90Dias(compras, new Date('2026-07-01T12:00:00.000Z'))).nivel, 'BRONZE');
});

test('exclui futuro e limite de 90 dias; rejeita compras inválidas', () => {
  const agora = new Date('2026-07-01T12:00:00.000Z');
  assert.equal(calcularGastoMovel90Dias([
    { valor: 10, ocorreuEm: '2026-04-02T12:00:00.000Z' },
    { valor: 20, ocorreuEm: '2026-04-02T12:00:01.000Z' },
    { valor: 30, ocorreuEm: '2026-07-01T12:00:01.000Z' },
  ], agora), 20);
  assert.throws(() => calcularGastoMovel90Dias([{ valor: -1, ocorreuEm: agora.toISOString() }], agora));
});
