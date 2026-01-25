import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function nowIso() {
  return new Date().toISOString();
}

// Função para validar e formatar data de nascimento (opcional)
function formatarDataNascimento(dataStr: string | null | undefined): string | null {
  if (!dataStr) return null;
  
  try {
    // Tenta converter para Date
    const data = new Date(dataStr);
    if (isNaN(data.getTime())) return null;
    
    // Retorna no formato YYYY-MM-DD que o Supabase aceita
    return data.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nome = String(body?.nome ?? '').trim();
    const telefone = onlyDigits(String(body?.telefone ?? ''));
    const dataNascimento = formatarDataNascimento(body?.data_nascimento);
    const pin = String(body?.pin ?? '').trim(); // ✅ Novo campo PIN

    // Validações básicas
    if (nome.length < 3) {
      return NextResponse.json({ ok: false, error: 'Nome precisa ter pelo menos 3 letras.' }, { status: 400 });
    }
    if (telefone.length !== 11) {
      return NextResponse.json({ ok: false, error: 'Telefone precisa ter 11 dígitos (DDD + número).' }, { status: 400 });
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ ok: false, error: 'PIN precisa ter exatamente 4 dígitos numéricos.' }, { status: 400 });
    }

    console.log('📝 Tentando cadastrar:', { nome, telefone, dataNascimento, pin: '****' }); // Não logar PIN

    // ✅ Hash do PIN para segurança
    const pinHash = crypto.createHash('sha256').update(pin).digest('hex');

    // 1. TENTAR CRIAR O CLIENTE (INSERT simples)
    const { error: clienteError } = await supabaseAdmin
      .from('clientes')
      .insert({
        telefone: telefone,
        nome: nome,
        data_nascimento: dataNascimento, // Pode ser null
        pin_hash: pinHash, // ✅ Novo campo
        criado_em: nowIso(),
        ultima_compra: null // Inicia como null
      });

    // Se der erro de "já existe", vamos continuar (é OK)
    if (clienteError && !clienteError.message.includes('duplicate')) {
      console.error('❌ Erro ao criar cliente:', clienteError);
      return NextResponse.json({ ok: false, error: `Erro no cliente: ${clienteError.message}` }, { status: 500 });
    }

    console.log('✅ Cliente criado/atualizado');

    // 2. VERIFICAR SE JÁ TEM PONTOS
    const { data: pontosData } = await supabaseAdmin
      .from('pontos')
      .select('telefone')
      .eq('telefone', telefone)
      .maybeSingle();

    // ✅ Bônus condicional: só 200 pontos se data_nascimento preenchida
    const pontosIniciais = dataNascimento ? 200 : 0;

    // 3. CRIAR PONTOS (com bônus condicional)
    if (!pontosData) {
      const { error: pontosError } = await supabaseAdmin
        .from('pontos')
        .insert({
          telefone: telefone,
          total: pontosIniciais,  // ✅ Bônus condicional
          pontos_qualificaveis: pontosIniciais,  // ✅ Bônus condicional
          nivel: 'BRONZE',
          atualizado_em: nowIso()
        });

      if (pontosError) {
        console.error('❌ Erro ao criar pontos:', pontosError);
        return NextResponse.json({ ok: false, error: `Erro nos pontos: ${pontosError.message}` }, { status: 500 });
      }
      console.log(`✅ Pontos criados com ${pontosIniciais} pontos iniciais`);
    }

    // 4. CRIAR CASHBACK (se não existir)
    const { data: cashbackData } = await supabaseAdmin
      .from('cashback')
      .select('telefone')
      .eq('telefone', telefone)
      .maybeSingle();

    if (!cashbackData) {
      await supabaseAdmin
        .from('cashback')
        .insert({
          telefone: telefone,
          saldo: 0,
          atualizado_em: nowIso()
        });
      console.log('✅ Cashback criado');
    }

    // 5. CRIAR TICKETS (se não existir)
    const { data: ticketsData } = await supabaseAdmin
      .from('tickets')
      .select('telefone')
      .eq('telefone', telefone)
      .maybeSingle();

    if (!ticketsData) {
      await supabaseAdmin
        .from('tickets')
        .insert({
          telefone: telefone,
          quantidade: 0,
          atualizado_em: nowIso()
        });
      console.log('✅ Tickets criados');
    }

    // 6. RETORNAR SUCESSO
    return NextResponse.json({
      ok: true,
      message: `Cadastro realizado com sucesso! Você ganhou ${pontosIniciais} pontos iniciais.`,
      telefone: telefone,
      bonus_pontos: pontosIniciais,
      data_nascimento: dataNascimento // Retorna a data formatada
    });

  } catch (err: any) {
    console.error('💥 ERRO GERAL:', err);
    return NextResponse.json({ ok: false, error: 'Erro interno no servidor.' }, { status: 500 });
  }
}