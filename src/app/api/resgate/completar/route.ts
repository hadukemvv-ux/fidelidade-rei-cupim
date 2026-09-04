import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateCustomerAuth } from '@/app/api/_utils/validateCustomerAuth';
import { hashPin } from '@/lib/pin';
import { isPreCadastro } from '@/lib/customerRegistration';

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
    cadastro_completo: !isPreCadastro(cliente),
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

    const authError = await validateCustomerAuth(req, telefone);
    if (authError) return authError;

    // -------------------------------------------------------------------
    // 🟩 NOVO: DETECTAR PRÉ‑CADASTRO (quando só enviam telefone)
    // -------------------------------------------------------------------
    const isChecagem =
      !body?.nome &&
      !body?.email &&
      !body?.data_nascimento &&
      !body?.pin;

    if (isChecagem) {
      const snap = await buscarSnapshot(telefone);

      const pendente = !snap.cadastro_completo;

      if (pendente) {
        return NextResponse.json({
          ok: true,
          pre_cadastro: true,
          status: "pendente",
          motivo: "Seu cadastro está incompleto."
        });
      }

      // cadastro já completo
      return NextResponse.json({
        ok: true,
        pre_cadastro: false,
        status: "completo"
      });
    }
    // -------------------------------------------------------------------


    if (nome.length < 3)
      return NextResponse.json({ ok: false, error: 'Nome inválido.' }, { status: 400 });

    if (!/^\d{4}$/.test(pin))
      return NextResponse.json({ ok: false, error: 'PIN deve ter 4 dígitos.' }, { status: 400 });

    const pin_hash = await hashPin(pin);


    // ——————————————
    // Validar email duplicado
    // ——————————————
    const { data: emailExiste } = email
      ? await supabaseAdmin.from('base_clientes_saipos').select('telefone').eq('email', email).maybeSingle()
      : { data: null };

    if (emailExiste && emailExiste.telefone !== telefone) {
      return NextResponse.json(
        { ok: false, error: 'Este email já está em uso.' },
        { status: 409 }
      );
    }


    // ——————————————
    // Atualizar o cliente
    // ——————————————
    const updateData: Record<string, unknown> = {
      nome,
      pin_hash,
      atualizado_em: iso(),
    };
    if (email) updateData.email = email;
    if (data_nascimento) updateData.data_nascimento = data_nascimento;

    const { error: updErr } = await supabaseAdmin
      .from('base_clientes_saipos')
      .update(updateData)
      .eq('telefone', telefone);

    if (updErr) throw updErr;


    const snap = await buscarSnapshot(telefone);

    return NextResponse.json({
      ok: true,
      atualizado: true,
      cliente: snap
    });

  } catch (err: unknown) {
    console.log('❌ ERRO EM COMPLETAR CADASTRO:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro interno.' },
      { status: 500 }
    );
  }
}
