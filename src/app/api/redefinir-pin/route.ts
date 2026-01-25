import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function nowIso() {
  return new Date().toISOString();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const telefone = onlyDigits(String(body?.telefone ?? ''));
    const dataNascimento = String(body?.data_nascimento ?? '').trim();
    const novoPin = String(body?.novo_pin ?? '').trim();

    if (telefone.length !== 11) {
      return NextResponse.json({ ok: false, error: 'Telefone inválido.' }, { status: 400 });
    }

    if (!dataNascimento) {
      return NextResponse.json({ ok: false, error: 'Data de nascimento obrigatória.' }, { status: 400 });
    }

    if (novoPin.length !== 4 || !/^\d{4}$/.test(novoPin)) {
      return NextResponse.json({ ok: false, error: 'Novo PIN precisa ter exatamente 4 dígitos numéricos.' }, { status: 400 });
    }

    // Verificar se cliente existe e data de nascimento bate
    const { data: cliente } = await supabaseAdmin.from('clientes')
      .select('data_nascimento')
      .eq('telefone', telefone)
      .maybeSingle();

    if (!cliente) {
      return NextResponse.json({ ok: false, error: 'Cliente não encontrado.' }, { status: 404 });
    }

    if (cliente.data_nascimento !== dataNascimento) {
      return NextResponse.json({ ok: false, error: 'Data de nascimento incorreta.' }, { status: 400 });
    }

    // Hash do novo PIN
    const novoPinHash = crypto.createHash('sha256').update(novoPin).digest('hex');

    // Atualizar PIN
    await supabaseAdmin.from('clientes')
      .update({ pin_hash: novoPinHash })
      .eq('telefone', telefone);

    return NextResponse.json({ ok: true, message: 'PIN redefinido com sucesso!' });

  } catch (err: any) {
    console.error('Erro ao redefinir PIN:', err);
    return NextResponse.json({ ok: false, error: 'Erro interno.' }, { status: 500 });
  }
}