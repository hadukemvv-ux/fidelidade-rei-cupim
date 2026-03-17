/**
 * Validation schemas using Zod
 * Used to validate API inputs and ensure type safety
 */

import { z } from 'zod';

// ============================================
// CLIENTE
// ============================================

export const ClienteSchema = z.object({
  telefone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos'),
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(255),
  email: z.string().email('Email inválido').optional().nullable(),
  data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar em formato YYYY-MM-DD').optional().nullable(),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos').optional().nullable(),
  pin: z.string().regex(/^\d{4}$/, 'PIN deve ter 4 dígitos').optional(),
});

export type ClienteValidation = z.infer<typeof ClienteSchema>;

// ============================================
// PEDIDO / VENDA
// ============================================

export const VendaSchema = z.object({
  valor: z.number().positive('Valor deve ser positivo'),
  telefone: z.string().regex(/^\d{10,11}$/, 'Telefone inválido'),
  origem: z.enum(['SAIPOS', 'MANUAL', 'QR_CODE']).default('SAIPOS'),
  id_pedido: z.string().optional(),
  descricao: z.string().max(500).optional(),
});

export type VendaValidation = z.infer<typeof VendaSchema>;

// ============================================
// RESGATE
// ============================================

export const ResgateSchema = z.object({
  telefone: z.string().regex(/^\d{10,11}$/),
  tipo: z.enum(['pontos', 'cashback', 'frete', 'produto']).optional(),
  valor: z.coerce.number().positive().optional(),
  valorDesconto: z.coerce.number().positive().optional(),
  produtoId: z.coerce.number().int().positive().optional(),
  pin: z.string().regex(/^\d{4}$/).optional(),
  descricao: z.string().max(500).optional(),
});

export type ResgateValidation = z.infer<typeof ResgateSchema>;

// ============================================
// PAGINAÇÃO
// ============================================

export const PaginacaoSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(20),
  ordenar_por: z.string().default('created_at'),
  ordem: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginacaoValidation = z.infer<typeof PaginacaoSchema>;

// ============================================
// CONSULTA
// ============================================

export const ConsultaSchema = z.object({
  telefone: z.string().regex(/^\d{10,11}$/, 'Telefone inválido'),
});

export type ConsultaValidation = z.infer<typeof ConsultaSchema>;

// ============================================
// SORTEIO
// ============================================

export const SorteioSchema = z.object({
  titulo: z.string().min(3).max(255),
  tipo_premio: z.string().min(3).max(255),
  descricao: z.string().max(1000).optional(),
  data_inicio: z.string().datetime(),
  data_fim: z.string().datetime(),
});

export type SorteioValidation = z.infer<typeof SorteioSchema>;

// ============================================
// HELPER: Parse e validar com error handling
// ============================================

export function validarDados<T>(schema: z.ZodSchema, dados: unknown): { ok: true; data: T } | { ok: false; error: string } {
  try {
    const resultado = schema.parse(dados);
    return { ok: true, data: resultado as T };
  } catch (erro) {
    if (erro instanceof z.ZodError) {
      const mensagens = erro.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return { ok: false, error: mensagens };
    }
    return { ok: false, error: 'Erro de validação desconhecido' };
  }
}
