import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// ======================================================
// GET — Buscar sorteio ativo
// ======================================================
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('sorteios')
      .select('id, titulo, descricao, imagem_url, data_sorteio, modo, status, criado_em, atualizado_em')
      .eq('status', 'ativo')
      .order('data_sorteio', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[GET /sorteio] Erro ->', error);
      return NextResponse.json(
        { error: 'Erro ao buscar sorteio.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, sorteio: data || null });

  } catch (err: any) {
    console.error('[GET /sorteio] Exception ->', err);
    return NextResponse.json(
      { error: 'Erro inesperado ao buscar sorteio.' },
      { status: 500 }
    );
  }
}

// ======================================================
// POST — Criar / Atualizar sorteio
// ======================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, titulo, descricao, imagem_url, data_sorteio, modo } = body;

    // -----------------------
    // VALIDAÇÃO
    // -----------------------
    if (!titulo?.trim()) {
      return NextResponse.json(
        { error: 'Título é obrigatório.' },
        { status: 400 }
      );
    }

    if (!data_sorteio || isNaN(Date.parse(data_sorteio))) {
      return NextResponse.json(
        { error: 'Data do sorteio inválida.' },
        { status: 400 }
      );
    }

    if (!['manual', 'automatico'].includes(modo)) {
      return NextResponse.json(
        { error: 'Modo inválido.' },
        { status: 400 }
      );
    }

    // ======================================================
    // UPDATE EXISTENTE
    // ======================================================
    if (id) {
      const { error } = await supabaseAdmin
        .from('sorteios')
        .update({
          titulo,
          descricao,
          imagem_url,
          data_sorteio,
          modo,
          status: 'ativo',
          atualizado_em: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        atualizado: true
      });
    }

    // ======================================================
    // CREATE — garantir que só exista 1 ativo
    // ======================================================
    const { error: finalizarAtivosErr } = await supabaseAdmin
      .from('sorteios')
      .update({ status: 'concluido' })
      .eq('status', 'ativo');

    if (finalizarAtivosErr) throw finalizarAtivosErr;

    // Criar sorteio novo
    const { data, error } = await supabaseAdmin
      .from('sorteios')
      .insert({
        titulo,
        descricao,
        imagem_url,
        data_sorteio,
        modo,
        status: 'ativo',
        criado_em: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      criado: true,
      sorteio: data
    });

  } catch (err: any) {
    console.error('[POST /sorteio] Exception ->', err);
    return NextResponse.json(
      { error: err.message || 'Erro inesperado ao salvar.' },
      { status: 500 }
    );
  }
}