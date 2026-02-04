import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function getRandomIndex(max: number) {
  return Math.floor(Math.random() * max);
}

export async function POST() {
  try {
    // 1. pegar sorteio ativo
    const { data: sorteio, error: sorteioErr } = await supabaseAdmin
      .from('sorteios')
      .select('*')
      .eq('status', 'ativo')
      .limit(1)
      .maybeSingle();

    if (sorteioErr) throw sorteioErr;

    if (!sorteio) {
      return NextResponse.json(
        { error: 'Nenhum sorteio ativo encontrado.' },
        { status: 404 }
      );
    }

    // 2. validar se já foi concluído (NÃO permitir segundo sorteio)
    const { data: ganhadorExistente } = await supabaseAdmin
      .from('sorteios_ganhadores')
      .select('*')
      .eq('sorteio_id', sorteio.id)
      .limit(1);

    if (ganhadorExistente && ganhadorExistente.length > 0) {
      return NextResponse.json(
        { error: 'Este sorteio já foi concluído.' },
        { status: 400 }
      );
    }

    // 3. pegar clientes elegíveis
    const { data: clientes, error: cliErr } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('id, nome, telefone, tickets')
      .gt('tickets', 0);

    if (cliErr) throw cliErr;

    if (!clientes || clientes.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum cliente possui tickets.' },
        { status: 400 }
      );
    }

    // 4. construir lista de entradas (melhorado)
    const entradas: any[] = [];
    clientes.forEach(cli => {
      const t = Number(cli.tickets) || 0;
      if (t > 0) entradas.push(...Array(t).fill(cli));
    });

    if (entradas.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma entrada válida no sorteio.' },
        { status: 400 }
      );
    }

    // 5. sortear
    const indexSorteado = getRandomIndex(entradas.length);
    const ganhador = entradas[indexSorteado];

    // 6. salvar ganhador (blindado)
    const { error: ganhadorErr } = await supabaseAdmin
      .from('sorteios_ganhadores')
      .insert({
        sorteio_id: sorteio.id,
        cliente_id: ganhador.id,
        nome_cliente: ganhador.nome,
        telefone_cliente: ganhador.telefone,
        tickets_no_sorteio: ganhador.tickets,
        criado_em: new Date(),
      });

    if (ganhadorErr) throw ganhadorErr;

    // 7. atualizar sorteio como concluído
    const { error: updErr } = await supabaseAdmin
      .from('sorteios')
      .update({ status: 'concluido' })
      .eq('id', sorteio.id);

    if (updErr) throw updErr;

    // 8. zerar tickets (somente depois de tudo perfeito)
    const { error: zerarErr } = await supabaseAdmin
      .from('base_clientes_saipos')
      .update({ tickets: 0 })
      .neq('tickets', 0);

    if (zerarErr) throw zerarErr;

    return NextResponse.json({
      ok: true,
      sorteio_id: sorteio.id,
      ganhador,
    });

  } catch (err: any) {
    console.error('ERRO NO SORTEIO:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}