import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Pega IP real do usuário
function getIP(req: Request) {
  return (
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}

// Salva log na tabela
async function salvarLog(params: any) {
  try {
    await supabaseAdmin.from("garcons_logs").insert(params);
  } catch (e) {
    console.error("Erro ao salvar log:", e);
  }
}

// ANTI-FRAUDE ROBUSTO
async function calcularFraudeScore(garcom_id: number, telefone: string, ip: string) {
  let score = 0;
  let motivos: string[] = [];

  const telLimpo = (telefone || "").replace(/\D/g, "");

  if (!telLimpo || telLimpo.length < 10 || /^(.)\1+$/.test(telLimpo)) {
    score += 40;
    motivos.push("telefone altamente suspeito ou inválido");
  }

  const { data: ultimos } = await supabaseAdmin
    .from("garcons_logs")
    .select("criado_em")
    .eq("garcom_id", garcom_id)
    .order("criado_em", { ascending: false })
    .limit(1);

  if (ultimos && ultimos.length > 0) {
    const diff = Date.now() - new Date(ultimos[0].criado_em).getTime();
    if (diff < 30000) { 
      score += 30;
      motivos.push(`giro muito rápido (${Math.floor(diff / 1000)}s)`);
    }
  }

  const { count: ultimos10min } = await supabaseAdmin
    .from("garcons_logs")
    .select("*", { count: "exact", head: true })
    .eq("garcom_id", garcom_id)
    .gte("criado_em", new Date(Date.now() - 10 * 60000).toISOString());

  if ((ultimos10min || 0) >= 3) {
    score += 40;
    motivos.push("muitos giros em 10 minutos");
  }

  return { score, motivos };
}

// GARANTIR CLIENTE
async function garantirCliente(telefone: string) {
  const tel = telefone.replace(/\D/g, '');

  // mínimo para ser número real
  if (tel.length < 10) return null;

  // 1 — TENTA BUSCAR
  let { data: clienteExiste, error: errBusca } = await supabaseAdmin
    .from('base_clientes_saipos')
    .select('*')
    .eq('telefone', tel)
    .maybeSingle();

  if (errBusca) {
    console.error("Erro ao buscar cliente:", errBusca);
    return null;
  }

  // 2 — SE EXISTE → só devolve
  if (clienteExiste) {
    return { cliente: clienteExiste, novo: false };
  }

  // 3 — NÃO EXISTE → criar novo pré-cadastro
  const pinProvisorio = tel.slice(0, 4);
  const pinHash = crypto.createHash("sha256").update(pinProvisorio).digest("hex");

  const novoCliente = {
    telefone: tel,
    nome: "Cliente Novo (Roleta)",
    email: null,
    data_nascimento: null,

    pontos: 0,
    cashback: 0,
    tickets: 0,

    nivel: "BRONZE",
    total_gasto: 0,
    qtd_pedidos: 0,

    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),

    origem: "roleta",
    pin_hash: pinHash,
  };

  const { data: criado, error: errInsert } = await supabaseAdmin
    .from("base_clientes_saipos")
    .insert(novoCliente)
    .select()
    .single();

  if (errInsert) {
    console.error("Erro ao criar cliente:", errInsert);
    return null;
  }

  return { cliente: criado, novo: true };
}

// POST — GIRO DA ROLETA
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const telefone = body.cliente_telefone || body.cliente_id;
    const senhaGarcom = body.garcom_id || body.senha_garcom;

    if (!senhaGarcom || senhaGarcom.length !== 4)
      return NextResponse.json({ error: 'Senha deve ter 4 dígitos.' }, { status: 403 });

    const prefixo = senhaGarcom.substring(0, 2);
    const sufixo = parseInt(senhaGarcom.substring(2, 4));
    if (![1, 2, 3].includes(sufixo))
      return NextResponse.json({ error: 'Nível inválido.' }, { status: 403 });

    const { data: garcom } = await supabaseAdmin
      .from('garcons')
      .select('id, nome, total_giros')
      .eq('codigo_prefixo', prefixo)
      .eq('ativo', true)
      .single();

    if (!garcom)
      return NextResponse.json({ error: 'Garçom não encontrado.' }, { status: 403 });

    const nivelNome = sufixo === 3 ? 'ouro' : sufixo === 2 ? 'prata' : 'bronze';

    let fraude_preliminar = { score: 0, motivos: [] as string[] };

    try {
      const ip = getIP(req);
      const { score, motivos } = await calcularFraudeScore(
        garcom.id,
        telefone || "",
        ip
      );
      fraude_preliminar = { score, motivos };
    } catch (e) {
      console.error("Falha no pré-diagnóstico:", e);
    }

    if (fraude_preliminar.score >= 60) {
      try {
        const ip = getIP(req);
        const userAgent = req.headers.get("user-agent") || "desconhecido";

        await salvarLog({
          garcom_id: garcom.id,
          telefone_cliente: telefone,
          premio: "BLOQUEADO",
          ip,
          user_agent: userAgent,
          score: fraude_preliminar.score,
          suspeito: true,
          motivo: fraude_preliminar.motivos.join(", ")
        });
      } catch (e) {}

      return NextResponse.json({
        error: "Atividade suspeita detectada. Giro BLOQUEADO.",
        fraude: fraude_preliminar
      }, { status: 403 });
    }

    const { data: premios } = await supabaseAdmin
      .from('premios_roleta')
      .select('*')
      .eq('ativo', true);

    if (!premios) throw new Error('Sem prêmios cadastrados.');

    let urna: any[] = [];

    premios.forEach(premio => {
      if (premio.nome.toLowerCase().includes('playstation')) return;

      let chance = premio.probabilidade || 1;

      if (premio.tipo === 'nada') {
        if (sufixo === 2) chance = Math.max(1, Math.floor(chance * 0.7));
        if (sufixo === 3) chance = Math.max(1, Math.floor(chance * 0.4));
      } else {
        if (sufixo === 2) chance = Math.floor(chance * 1.5);
        if (sufixo === 3) chance = Math.floor(chance * 2.5);
      }

      for (let i = 0; i < chance; i++) urna.push(premio);
    });

    if (urna.length === 0) urna.push(premios[0]);

    const premioSorteado = urna[Math.floor(Math.random() * urna.length)];
    let ehNovo = false;

    // GARANTIR QUE O CLIENTE EXISTE SEMPRE (PRIMEIRA AÇÃO)
let clienteCriadoOuEncontrado = null;

if (telefone) {
  clienteCriadoOuEncontrado = await garantirCliente(telefone);
  ehNovo = clienteCriadoOuEncontrado?.novo || false;
}

// CASO O PRÊMIO TENHA PONTOS — AÍ SIM ATUALIZA OS PONTOS
if (premioSorteado.tipo === 'pontos' && telefone) {

  const clienteInfo = clienteCriadoOuEncontrado?.cliente;
  if (clienteInfo) {

    const valorPontos = premioSorteado.valor_pontos || 200;

    await supabaseAdmin
      .from('base_clientes_saipos')
      .update({ pontos: (clienteInfo.pontos || 0) + valorPontos })
      .eq('id', clienteInfo.id);

    await supabaseAdmin.from("extrato_pontos").insert({
      cliente_id: clienteInfo.id,
      tipo: "entrada",
      valor: valorPontos,
      origem: "ROLETA",
      descricao: `Prêmio Roleta - Garçom ${garcom.nome}`,
      criado_em: new Date().toISOString(),
      metodo: "roleta"
    });
  }
}

    await supabaseAdmin.from('historico_roleta').insert({
      cliente_telefone: telefone.replace(/\D/g, ""),
      premio_nome: premioSorteado.nome,
      garcom_id: garcom.id,
      nivel_venda: sufixo
    });

    await supabaseAdmin
      .from('garcons')
      .update({ total_giros: (garcom.total_giros || 0) + 1 })
      .eq('id', garcom.id);

    try {
      const ip = getIP(req);
      const userAgent = req.headers.get("user-agent") || "desconhecido";

      const { score, motivos } = await calcularFraudeScore(
        garcom.id,
        telefone || "",
        ip
      );

      await salvarLog({
        garcom_id: garcom.id,
        telefone_cliente: telefone,
        premio: premioSorteado.nome,
        ip,
        user_agent: userAgent,
        score,
        suspeito: score >= 30,
        motivo: motivos.join(", ")
      });
    } catch (err) {}

    return NextResponse.json({
      premio: premioSorteado,
      nivel_usado: nivelNome,
      cliente_novo: ehNovo,
      fraude_preliminar,
      mensagem: ehNovo
        ? 'Conta criada! Use os 4 primeiros dígitos do seu Whats como senha no Delivery.'
        : 'Prêmio aplicado!'
    });

  } catch (err) {
    console.error('Erro Roleta:', err);
    return NextResponse.json({ error: 'Erro interno no sorteio.' }, { status: 500 });
  }
}