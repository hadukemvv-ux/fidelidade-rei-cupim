import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

function iso() {
  return new Date().toISOString();
}

function validarEmail(email?: string | null) {
  if (!email) return null;
  const e = String(email).trim().toLowerCase();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(e) ? e : null;
}

function validarDataNascimento(str?: string | null) {
  if (!str) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return str;
}

async function buscarSnapshot(telefone: string) {
  const { data: cliente } = await supabaseAdmin
    .from('base_clientes_saipos')
    .select('*')
    .eq('telefone', telefone)
    .maybeSingle();

  if (!cliente) throw new Error('Cliente não encontrado.');

  return {
    nome: cliente.nome,
    email: cliente.email,
    telefone,
    data_nascimento: cliente.data_nascimento,
    pontos: cliente.pontos,
    cashback: cliente.cashback,
    tickets: cliente.tickets,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const telefone = onlyDigits(body?.telefone || '');
    const nome = String(body?.nome || '').trim();
    const email = validarEmail(body?.email);
    const data_nascimento = validarDataNascimento(body?.data_nascimento);
    const pin = String(body?.pin || '').trim();

    if (telefone.length !== 11)
      return NextResponse.json({ ok: false, error: 'Telefone inválido.' }, { status: 400 });

    if (nome.length < 3)
      return NextResponse.json({ ok: false, error: 'Nome inválido.' }, { status: 400 });

    if (!email)
      return NextResponse.json({ ok: false, error: 'Email inválido.' }, { status: 400 });

    if (!data_nascimento)
      return NextResponse.json({ ok: false, error: 'Data de nascimento inválida.' }, { status: 400 });

    if (!/^\d{4}$/.test(pin))
      return NextResponse.json({ ok: false, error: 'PIN deve ter 4 dígitos.' }, { status: 400 });

    const pin_hash = crypto.createHash('sha256').update(pin).digest('hex');


    // ——————————————
    // Validar email duplicado
    // ——————————————
    const { data: emailExiste } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('telefone')
      .eq('email', email)
      .maybeSingle();

    if (emailExiste && emailExiste.telefone !== telefone) {
      return NextResponse.json(
        { ok: false, error: 'Este email já está em uso.' },
        { status: 409 }
      );
    }


    // ——————————————
    // Atualizar o cliente
    // ——————————————
    const { error: updErr } = await supabaseAdmin
      .from('base_clientes_saipos')
      .update({
        nome,
        email,
        data_nascimento,
        pin_hash,
        atualizado_em: iso()
      })
      .eq('telefone', telefone);

    if (updErr) throw updErr;


    const snap = await buscarSnapshot(telefone);

    return NextResponse.json({
      ok: true,
      atualizado: true,
      cliente: snap
    });

  } catch (err: any) {
    console.log('❌ ERRO EM COMPLETAR CADASTRO:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'Erro interno.' },
      { status: 500 }
    );
  }
}