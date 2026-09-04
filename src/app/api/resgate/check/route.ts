import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isPreCadastro } from '@/lib/customerRegistration';

function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const telefone = onlyDigits(body?.telefone || '');

    if (telefone.length !== 11) {
      return NextResponse.json(
        { ok: false, status: 'erro', error: 'Telefone inválido' },
        { status: 400 }
      );
    }

    // Buscar cliente
    const { data: cliente } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('*')
      .eq('telefone', telefone)
      .maybeSingle();

    // 1) Cliente NÃO existe
    if (!cliente) {
      return NextResponse.json({
        ok: true,
        status: 'novo',
        cadastro_completo: false,
        motivo: 'Telefone não encontrado.'
      });
    }

    // 2) Cliente existe → verificar se está incompleto
    if (isPreCadastro(cliente)) {
      return NextResponse.json({
        ok: true,
        status: 'pre_cadastro',
        cadastro_completo: false,
        motivo: 'Cadastro incompleto.'
      });
    }

    // 3) Cliente existe e cadastro está completo
    return NextResponse.json({
      ok: true,
      status: 'completo',
      cadastro_completo: true
    });

  } catch (err: unknown) {
    console.error('[CHECK ERROR]:', err);
    return NextResponse.json(
      { ok: false, status: 'erro', error: err instanceof Error ? err.message : 'Erro interno.' },
      { status: 500 }
    );
  }
}
