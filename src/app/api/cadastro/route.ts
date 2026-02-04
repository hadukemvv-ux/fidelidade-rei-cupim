import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

// Helpers
function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

function iso() {
  return new Date().toISOString();
}

function validarDataNascimento(str?: string | null) {
  if (!str) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;

  const d = new Date(str);
  if (isNaN(d.getTime())) return null;

  const ano = d.getFullYear();
  const hoje = new Date();

  if (ano < 1920) return null;
  if (d > hoje) return null;

  return str;
}

async function registrarExtrato(cliente_id: number, valor: number, descricao: string) {
  try {
    await supabaseAdmin.from('extrato_pontos').insert({
      cliente_id,
      tipo: 'entrada',
      valor,
      origem: 'SISTEMA',
      descricao,
      criado_em: iso(),
      metodo: 'cadastro'
    });
  } catch (e) {
    console.log('⚠️ Extrato falhou:', e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const nomeNovo = String(body?.nome ?? '').trim();
    const telefone = onlyDigits(String(body?.telefone ?? ''));
    const pin = String(body?.pin ?? '').trim();
    const dataNascimentoNova = validarDataNascimento(body?.data_nascimento);

    if (nomeNovo.length < 3)
      return NextResponse.json({ ok: false, error: 'Nome inválido.' }, { status: 400 });

    if (telefone.length !== 11)
      return NextResponse.json({ ok: false, error: 'Telefone inválido.' }, { status: 400 });

    if (!/^\d{4}$/.test(pin))
      return NextResponse.json({ ok: false, error: 'PIN inválido (4 dígitos).' }, { status: 400 });

    const pin_hash = crypto.createHash('sha256').update(pin).digest('hex');

    // Buscar todos os clientes com o mesmo telefone
    const { data: encontrados } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('*')
      .eq('telefone', telefone);

    // CASO 1 — CRIAÇÃO
    if (!encontrados || encontrados.length === 0) {
      const bonus = dataNascimentoNova ? 200 : 0;

      const { data: novo, error: errIns } = await supabaseAdmin
        .from('base_clientes_saipos')
        .insert({
          nome: nomeNovo,
          telefone,
          pin_hash,
          data_nascimento: dataNascimentoNova,
          pontos: bonus,
          cashback: 0,
          tickets: 0,
          nivel: 'BRONZE',
          total_gasto: 0,
          qtd_pedidos: 0,
          primeira_compra: null,
          ultima_compra: null,
          atualizado_em: iso()
        })
        .select('*')
        .single();

      if (errIns) throw errIns;

      if (bonus > 0)
        await registrarExtrato(novo.id, bonus, 'Bônus de Cadastro');

      return NextResponse.json({ ok: true, criado: true, message: 'Cadastro realizado com sucesso!' });
    }

    // CASO 2 — CLIENTE EXISTE (1 único registro válido)
    if (encontrados.length === 1) {
      const cliente = encontrados[0];

      // BLOQUEIOS ABSOLUTOS

      // 1. NÃO permitir troca de nome se já existe nome salvo
      if (cliente.nome && cliente.nome.trim().length > 0 && cliente.nome !== nomeNovo) {
        return NextResponse.json(
          { ok: false, error: 'Este número já possui cadastro. O nome não pode ser alterado.' },
          { status: 403 }
        );
      }

      // 2. NÃO permitir trocar data de nascimento se já existe uma salva
      if (cliente.data_nascimento && cliente.data_nascimento !== dataNascimentoNova) {
        return NextResponse.json(
          { ok: false, error: 'Data de nascimento não pode ser alterada após o cadastro.' },
          { status: 403 }
        );
      }

      // 3. NÃO permitir trocar PIN se já existe
      if (cliente.pin_hash && cliente.pin_hash !== pin_hash) {
        return NextResponse.json(
          { ok: false, error: 'PIN incorreto. Para alterar, use "Esqueci meu PIN".' },
          { status: 401 }
        );
      }

      // Se o cliente existe E tudo bate → atualizar apenas se faltava algo
      const updateData: any = {
        atualizado_em: iso(),
      };

      if (!cliente.nome) updateData.nome = nomeNovo;
      if (!cliente.data_nascimento) updateData.data_nascimento = dataNascimentoNova;
      if (!cliente.pin_hash) updateData.pin_hash = pin_hash;

      await supabaseAdmin
        .from('base_clientes_saipos')
        .update(updateData)
        .eq('id', cliente.id);

      return NextResponse.json({
        ok: true,
        atualizado: true,
        message: 'Cadastro já existia — dados complementares adicionados com sucesso.'
      });
    }

    // CASO 3 — DUPLICADOS (situação rara, mas corrigimos)
    const ids = encontrados.map((c) => c.id);
    const principal = encontrados[0];
    const paraExcluir = ids.slice(1);

    await supabaseAdmin.from('base_clientes_saipos')
      .delete()
      .in('id', paraExcluir);

    return NextResponse.json({
      ok: true,
      unificado: true,
      message: 'Cadastro unificado automaticamente. Faça login novamente.'
    });

  } catch (err: any) {
    console.error('❌ ERRO CADASTRO:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'Erro interno.' },
      { status: 500 }
    );
  }
}