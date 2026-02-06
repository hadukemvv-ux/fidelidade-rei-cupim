import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

function iso() {
  return new Date().toISOString();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const telefone = onlyDigits(String(body?.telefone ?? ''));
    const dataNascimento = String(body?.data_nascimento ?? '').trim();  // yyyy-mm-dd
    const novoPin = String(body?.novo_pin ?? '').trim();

    if (telefone.length !== 11)
      return NextResponse.json({ ok: false, error: 'Telefone inválido.' }, { status: 400 });

    if (!dataNascimento)
      return NextResponse.json({ ok: false, error: 'Data de nascimento obrigatória.' }, { status: 400 });

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento))
      return NextResponse.json({ ok: false, error: 'Data de nascimento inválida.' }, { status: 400 });

    if (novoPin.length !== 4)
      return NextResponse.json({ ok: false, error: 'PIN deve ter 4 dígitos.' }, { status: 400 });

    const novoPinHash = crypto.createHash('sha256').update(novoPin).digest('hex');

    // ============================
    // BUSCAR CLIENTE COMPLETO
    // ============================
    const { data: cliente } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('id, nome, telefone, pin_hash, data_nascimento')
      .eq('telefone', telefone)
      .maybeSingle();

    if (!cliente) {
      return NextResponse.json(
        { ok: false, error: 'Cliente não encontrado.' },
        { status: 404 }
      );
    }

    if (!cliente.data_nascimento) {
      return NextResponse.json(
        { ok: false, error: 'Você não cadastrou data de nascimento. Entre em contato com o suporte.' },
        { status: 400 }
      );
    }

    if (cliente.data_nascimento !== dataNascimento) {
      return NextResponse.json(
        { ok: false, error: 'Data de nascimento não confere.' },
        { status: 400 }
      );
    }

    if (cliente.pin_hash === novoPinHash) {
      return NextResponse.json(
        { ok: false, error: 'Este já é o seu PIN atual.' },
        { status: 400 }
      );
    }

    // ============================
    // ATUALIZAR PIN
    // ============================
    const { error: updErr } = await supabaseAdmin
      .from('base_clientes_saipos')
      .update({ pin_hash: novoPinHash, atualizado_em: iso() })
      .eq('id', cliente.id);

    if (updErr) throw updErr;

    // ============================
    // LOG opcional de auditoria
    // ============================
    try {
      await supabaseAdmin.from('logs_seguranca').insert({
        cliente_id: cliente.id,
        acao: 'PIN_REDEFINIDO',
        data: iso(),
      });
    } catch {
      // silencioso — não impede o fluxo
    }

    return NextResponse.json({
      ok: true,
      message: 'PIN redefinido com sucesso!'
    });

  } catch (err: any) {
    console.error('[ERRO /redefinir-pin]:', err);
    return NextResponse.json(
      { ok: false, error: 'Erro interno.' },
      { status: 500 }
    );
  }
}