import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const CRON_SECRET = process.env.CRON_SECRET;

// Random index seguro
function randomIndex(max: number) {
  return Math.floor(Math.random() * max);
}

export async function GET(req: NextRequest) {
  try {
    // 1. validar segredo
    if (!CRON_SECRET) {
      return NextResponse.json(
        { error: "CRON_SECRET não configurado no servidor." },
        { status: 500 }
      );
    }

    const token = req.headers.get("authorization")?.replace("Bearer ", "")
      || req.nextUrl.searchParams.get("token")
      || req.nextUrl.searchParams.get("secret"); // compatibilidade com chamadas antigas

    if (token !== CRON_SECRET) {
      return NextResponse.json(
        { error: "Acesso não autorizado" },
        { status: 401 }
      );
    }

    // 2. buscar sorteio ativo
    const { data: sorteio, error: sorteioErr } = await supabaseAdmin
      .from("sorteios")
      .select("*")
      .eq("status", "ativo")
      .order("data_sorteio", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (sorteioErr) throw sorteioErr;

    if (!sorteio) {
      return NextResponse.json({ message: "Nenhum sorteio ativo encontrado" });
    }

    const sorteioLegacyId = Number(sorteio.id_new);
    if (!Number.isInteger(sorteioLegacyId) || sorteioLegacyId <= 0) {
      return NextResponse.json(
        { error: "Sorteio ativo sem id_new valido. Corrija o cadastro do sorteio." },
        { status: 500 }
      );
    }

    const agora = new Date();
    const dataSorteio = new Date(sorteio.data_sorteio);

    if (agora < dataSorteio) {
      return NextResponse.json({
        message: "Ainda não é a data do sorteio",
      });
    }

    // 3. verificar se já tem ganhador (impede duplicidade)
    const { data: ganhadoresExistentes } = await supabaseAdmin
      .from("sorteios_ganhadores")
      .select("*")
      .eq("sorteio_id", sorteioLegacyId)
      .limit(1);

    if (ganhadoresExistentes && ganhadoresExistentes.length > 0) {
      return NextResponse.json({
        message: "Sorteio já foi concluído anteriormente",
      });
    }

    // 4. buscar clientes com tickets
    const { data: clientes, error: cliErr } = await supabaseAdmin
      .from("base_clientes_saipos")
      .select("id, nome, telefone, tickets")
      .gt("tickets", 0);

    if (cliErr) throw cliErr;

    if (!clientes || clientes.length === 0) {
      return NextResponse.json({ message: "Ninguém possui tickets" });
    }

    // 5. montar entradas
    const entradas: any[] = [];
    clientes.forEach(cli => {
      const t = Number(cli.tickets) || 0;
      if (t > 0) entradas.push(...Array(t).fill(cli));
    });

    if (entradas.length === 0) {
      return NextResponse.json({
        message: "Nenhuma entrada válida no sorteio",
      });
    }

    // 6. selecionar ganhador
    const idx = randomIndex(entradas.length);
    const ganhador = entradas[idx];

    // 7. gravar ganhador
    const { error: saveErr } = await supabaseAdmin
      .from("sorteios_ganhadores")
      .insert({
        sorteio_id: sorteioLegacyId,
        cliente_id: null,
        nome_cliente: ganhador.nome,
        telefone_cliente: ganhador.telefone,
        tickets_no_sorteio: ganhador.tickets,
        criado_em: new Date(),
      });

    if (saveErr) throw saveErr;

    // 8. marcar o sorteio como concluído
    const { error: updErr } = await supabaseAdmin
      .from("sorteios")
      .update({ status: "concluido" })
      .eq("id", sorteio.id);

    if (updErr) throw updErr;

    // 9. zerar tickets (depois do sucesso)
    await supabaseAdmin
      .from("base_clientes_saipos")
      .update({ tickets: 0 })
      .neq("tickets", 0);

    return NextResponse.json({
      ok: true,
      message: "Sorteio automático executado com sucesso",
      sorteio_id: sorteioLegacyId,
      sorteio_uuid: sorteio.id,
      ganhador,
    });

  } catch (err: any) {
    console.error("[CRON SORTEIO ERROR]:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}