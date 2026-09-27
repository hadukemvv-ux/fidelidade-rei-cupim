import assert from 'node:assert/strict';
import test from 'node:test';
import { auditarTelefonesSaipos, diagnosticarFormatoTelefoneSaipos } from '../src/lib/saiposPhoneAudit.ts';

test('agrega presença e repetição sem revelar telefones nem clientes', () => {
  const resumo = auditarTelefonesSaipos([
    { id_sale_type: 1, customer: { phone: '+55 (85) 98888-7777' } },
    { id_sale_type: 1, customer_phone: '85 98888-7777' },
    { id_sale_type: 1, customer: { phone: '98888-7777' } },
    { id_sale_type: 2, customer_phone: '85911112222' },
    { id_sale_type: 2, customer: { phone: '85922223333' } },
  ]);
  assert.deepEqual(resumo.geral, {
    vendas: 5, com_telefone_ddd: 4, sem_telefone_ddd: 1,
    telefones_distintos: 3, telefones_repetidos: 1,
    vendas_com_telefone_repetido: 2, maior_repeticao: 2,
  });
  assert.equal(resumo.por_tipo['1'].sem_telefone_ddd, 1);
  assert.equal(resumo.por_tipo['2'].maior_repeticao, 1);
  assert.equal(JSON.stringify(resumo).includes('98888'), false);
});

test('diagnostica formato sem devolver dígitos, nome ou CPF', () => {
  const formato = diagnosticarFormatoTelefoneSaipos({
    customer: { phone: '(85) 98888-7777', name: 'Pessoa Teste', cpf_cnpj: '12345678901' },
  });
  assert.deepEqual(formato.campos_esperados[0], {
    campo: 'customer.phone', presente: true, quantidade_digitos: 11,
  });
  const texto = JSON.stringify(formato);
  assert.equal(texto.includes('98888'), false);
  assert.equal(texto.includes('Pessoa Teste'), false);
  assert.equal(texto.includes('12345678901'), false);
});
