import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Campos permitidos na tabela
const CAMPOS_VALIDOS = [
  'nome',
  'descricao',
  'custo_em_pontos',
  'categoria',
  'imagem_url',
  'destaque',
  'ativo'
];

function filtrarCampos(body: any) {
  const permitido: any = {};
  for (const key of CAMPOS_VALIDOS) {
    if (body[key] !== undefined) {
      permitido[key] = body[key];
    }
  }
  return permitido;
}

// ================================
// PUT — Atualizar produto
// ================================
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id)
      return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });

    // Filtrar somente campos válidos
    const updates = filtrarCampos(body);
    updates.atualizado_em = new Date().toISOString();

    if (updates.imagem_url && !updates.imagem_url.startsWith('/'))
      updates.imagem_url = '/' + updates.imagem_url;

    const { data, error } = await supabaseAdmin
      .from('produtos_loja')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, produto: data });

  } catch (error: any) {
    console.error('[PUT /admin/produtos] ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ================================
// POST — Criar novo produto
// ================================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const produto = filtrarCampos(body);
    produto.criado_em = new Date().toISOString();
    produto.atualizado_em = new Date().toISOString();
    produto.ativo = produto.ativo ?? true;
    produto.destaque = produto.destaque ?? false;

    if (!produto.nome?.trim())
      return NextResponse.json({ error: 'Nome do produto é obrigatório.' }, { status: 400 });

    if (!produto.custo_em_pontos || produto.custo_em_pontos <= 0)
      return NextResponse.json({ error: 'Custo em pontos inválido.' }, { status: 400 });

    if (!produto.categoria)
      produto.categoria = 'geral';

    if (produto.imagem_url && !produto.imagem_url.startsWith('/'))
      produto.imagem_url = '/' + produto.imagem_url;

    const { data, error } = await supabaseAdmin
      .from('produtos_loja')
      .insert([produto])
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, produto: data });

  } catch (error: any) {
    console.error('[POST /admin/produtos] ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}