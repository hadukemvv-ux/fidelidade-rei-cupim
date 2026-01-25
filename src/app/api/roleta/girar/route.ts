import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Definição das Senhas e Níveis
const NIVEIS = {
  '1111': 'bronze',  // Conta R$ 100+
  '2222': 'prata',   // Conta R$ 200+
  '3333': 'ouro'     // Conta R$ 300+
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cliente_id, senha_garcom } = body;

    // 1. Validação da Senha do Garçom
    const nivel = NIVEIS[senha_garcom as keyof typeof NIVEIS];
    
    if (!nivel) {
      return NextResponse.json({ error: 'Senha do garçom incorreta.' }, { status: 403 });
    }

    // 2. Busca Prêmios Ativos
    const { data: premios, error } = await supabaseAdmin
      .from('premios_roleta')
      .select('*')
      .eq('ativo', true);

    if (error || !premios) throw new Error('Erro ao buscar prêmios no sistema.');

    // 3. Filtro de Probabilidade por Nível (Ajuste Fino)
    // Aqui manipulamos a sorte. Quem é OURO tem menos chance de "Nada" e mais de "Coisa Boa".
    let urna: any[] = [];
    
    premios.forEach(premio => {
      let chance = premio.probabilidade;

      // AJUSTES DINÂMICOS DE SORTE
      if (nivel === 'prata') {
        if (premio.tipo === 'nada') chance = Math.max(0, chance - 10); // Menos azar
        if (premio.tipo === 'pontos') chance += 10; // Mais pontos
      }
      if (nivel === 'ouro') {
        if (premio.tipo === 'nada') chance = Math.max(0, chance - 20); // Muito menos azar
        if (premio.tipo === 'pontos') chance += 20; // Muito mais pontos
        if (premio.tipo === 'fisico') chance += 5;  // Mais prêmios físicos
      }

      // Adiciona bolinhas na urna virtual
      for (let i = 0; i < chance; i++) {
        urna.push(premio);
      }
    });

    // Embaralha e Sorteia
    if (urna.length === 0) throw new Error('Erro de configuração da roleta.');
    const indiceSorteado = Math.floor(Math.random() * urna.length);
    const premioSorteado = urna[indiceSorteado];

    // Segurança Anti-PS5 (Garantia Absoluta)
    if (!premioSorteado || premioSorteado.emoji === '🎮' || premioSorteado.probabilidade === 0) {
       // Se cair no bug ou no PS5, força "Nada"
       const premioNada = premios.find(p => p.tipo === 'nada') || premios[0];
       return NextResponse.json({ premio: premioNada, nivel_usado: nivel });
    }

    // 4. SE GANHOU PONTOS -> Grava no Extrato
    if (premioSorteado.tipo === 'pontos' && cliente_id) {
      const { error: erroPontos } = await supabaseAdmin
        .from('extrato_pontos')
        .insert({
          cliente_id: cliente_id,
          tipo: 'entrada',
          valor: premioSorteado.valor_pontos,
          origem: 'roleta',
          descricao: `Ganhou na Roleta (Nível ${nivel.toUpperCase()})`
        });

      if (erroPontos) console.error('Erro ao creditar pontos:', erroPontos);
    }

    return NextResponse.json({ 
      premio: premioSorteado, 
      nivel_usado: nivel,
      mensagem: premioSorteado.tipo === 'pontos' ? 'Pontos creditados!' : 'Mostre ao garçom!'
    });

  } catch (err: any) {
    console.error('Erro Roleta:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}