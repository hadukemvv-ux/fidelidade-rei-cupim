/**
 * Global type definitions for the loyalty program
 * Used across all API endpoints and business logic
 */

export type NivelFidelidade = 'BRONZE' | 'PRATA' | 'OURO' | 'REI';

export interface Cliente {
  id: number;
  telefone: string;
  nome: string;
  email?: string | null;
  data_nascimento?: string | null;
  cpf?: string | null;
  nivel: NivelFidelidade;
  pontos: number;
  cashback: number;
  tickets: number;
  total_gasto: number;
  qtd_pedidos: number;
  primeira_compra: string;
  ultima_compra: string;
  atualizado_em: string;
  pin_hash?: string | null;
  bloqueado?: boolean;
  motivo_bloqueio?: string | null;
}

export interface Pedido {
  id_sale: string;
  cliente_id: number;
  valor: number;
  pontos_ganhos: number;
  cashback_ganho: number;
  tickets_ganhos: number;
  nivel_na_compra: NivelFidelidade;
  data_compra: string;
  origem: 'SAIPOS' | 'MANUAL' | 'QR_CODE';
  status: 'processado' | 'pendente' | 'cancelado';
}

export interface Sorteio {
  id: number;
  titulo: string;
  status: 'ativo' | 'finalizado' | 'pausado';
  data_inicio: string;
  data_fim: string;
  tipo_premio: string;
  descricao?: string;
  regras?: string;
}

export interface GanhadorSorteio {
  id: number;
  sorteio_id: number;
  cliente_id: number;
  nome_cliente: string;
  telefone_cliente: string;
  tickets_no_sorteio: number;
  criado_em: string;
  sorteio_titulo?: string;
}

export interface Resgate {
  id: number;
  cliente_id: number;
  tipo: 'pontos' | 'cashback' | 'frete';
  valor: number;
  status: 'solicitado' | 'aprovado' | 'rejeitado' | 'entregue';
  criado_em: string;
  processado_em?: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  ok: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CronJobResult {
  success: boolean;
  message: string;
  processed: number;
  errors: number;
  timestamp: string;
}
