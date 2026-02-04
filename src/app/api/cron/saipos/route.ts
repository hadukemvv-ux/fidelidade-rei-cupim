import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const SAIPOS_TOKEN = process.env.SAIPOS_TOKEN!;
// Endpoint confirmado pelo diagnóstico
const URL_SAIPOS = 'https://data.saipos.io/v1/search_sales';

function limparTelefone(tel: string) {
  if (!tel) return '';
  return tel.replace(/\D/g, '');
}

export async function GET() {
  try {
    if (!SAIPOS_TOKEN) throw new Error('Token Saipos não configurado.');

    // Datas de Hoje
    const hoje = new Date();
    const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0).toISOString();
    const dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString();

    // Parâmetros idênticos ao CURL oficial da Saipos
    const params = new URLSearchParams({
  p_date_column_filter: 'shift_date',
  p_filter_date_start: dataInicio,
  p_filter_date_end: dataFim,
  p_limit: '100',
  p_offset: '0',
  p_store: '62039' // ID REAL DA LOJA
});

    const finalUrl = `${URL_SAIPOS}?${params.toString()}`;

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SAIPOS_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
        const erroTexto = await response.text();
        // Retorna o erro exato para você ver no navegador
        return NextResponse.json({ 
            erro: `Erro API Saipos: ${response.status}`, 
            detalhes: erroTexto,
            url_tentada: finalUrl
        }, { status: response.status });
    }

    const dados = await response.json();
    const vendas = Array.isArray(dados) ? dados : (dados.data || []);

    // ... (Resto do código de pontuação continua igual) ...
    // Se quiser, posso colar o bloco de pontuação aqui de novo, 
    // mas é o mesmo das versões anteriores.
    
    return NextResponse.json({
        sucesso: true,
        vendas_encontradas: vendas.length
    });

  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 });
  }
}