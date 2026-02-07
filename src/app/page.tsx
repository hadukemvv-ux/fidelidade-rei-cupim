'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const [nivelSelecionado, setNivelSelecionado] = useState('BRONZE');

  const beneficios = {
    BRONZE: {
      multiplicador: '4x',
      cashback: '0,25%',
      tickets: '1 a cada R$ 50',
      emoji: '🥉',
      nome: 'Bronze',
      descricao: 'Nível inicial. Comece a pontuar agora!',
      meta: 'Cadastro Grátis'
    },
    PRATA: {
      multiplicador: '7x',
      cashback: '1,00%',
      tickets: '2 a cada R$ 50',
      emoji: '🥈',
      nome: 'Prata',
      descricao: 'Acelerando seus ganhos.',
      meta: 'Acumular R$ 100 em compras' // ✅ Atualizado
    },
    OURO: {
      multiplicador: '10x',
      cashback: '2,00%',
      tickets: '3 a cada R$ 50',
      emoji: '🥇',
      nome: 'Ouro',
      descricao: 'Benefícios em dobro e status VIP.',
      meta: 'Acumular R$ 300 em compras' // ✅ Atualizado
    },
    REI_DO_CUPIM: {
      multiplicador: '14x',
      cashback: '3,00%',
      tickets: '4 a cada R$ 50',
      emoji: '👑',
      nome: 'Rei do Cupim',
      descricao: 'A realeza! O máximo de retorno possível.',
      meta: 'Acumular R$ 600 em compras' // ✅ Atualizado
    }
  };

  const beneficioAtual = beneficios[nivelSelecionado as keyof typeof beneficios];

  return (
    <div className="min-h-screen bg-[#280404] text-white font-sans">
      {/* Header */}
      <header className="pt-12 pb-6 flex flex-col items-center justify-center">
        <div className="relative w-48 h-48 mb-4">
          <img
            src="/logo.png"
            alt="Logo Rei do Cupim"
            className="w-full h-full object-contain"
          />
        </div>

        <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-center">
          <span className="text-[#c5a059]">👑</span>
          <span className="bg-gradient-to-r from-[#c5a059] via-white to-[#c5a059] bg-clip-text text-transparent">
            CLUBE REI DO CUPIM
          </span>
          <span className="text-[#c5a059]">🔪</span>
        </h1>

        <div className="w-32 h-1 bg-[#e31e24] mt-4 shadow-[0_0_10px_#e31e24]"></div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto text-center px-6 py-10">
        <p className="text-xl md:text-2xl text-zinc-300 font-medium italic leading-relaxed">
          Transforme seu churrasco em <span className="text-[#c5a059] font-bold">experiências, descontos e prêmios</span>.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center mt-12">
          <Link
            href="/cadastro"
            className="bg-[#e31e24] hover:bg-[#c1191f] text-white font-black py-5 px-12 rounded-sm text-lg transition-all shadow-[6px_6px_0px_#c5a059] active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            QUERO ME CADASTRAR
          </Link>

          <Link
            href="/resgate"
            className="bg-transparent hover:bg-[#4d0808]/50 text-[#c5a059] border-2 border-[#c5a059] font-bold py-5 px-12 rounded-sm text-lg transition-all"
          >
            CONSULTAR PONTOS
          </Link>
        </div>
      </section>

      {/* Benefícios - Nível Selecionado */}
      <section className="max-w-6xl mx-auto py-16 px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-white uppercase tracking-[0.2em] mb-3">
            Conheça os Níveis
          </h2>
          <p className="text-zinc-300 text-sm">
            Seu nível é baseado no total que você já gastou com a gente (XP Vitalício).
          </p>
          
          <div className="mt-8 mb-4">
             <span className="text-5xl animate-bounce inline-block">{beneficioAtual.emoji}</span>
             <h3 className="text-[#c5a059] font-black text-3xl mt-2">{beneficioAtual.nome}</h3>
          </div>
          
          <p className="text-zinc-200 text-lg font-medium">{beneficioAtual.descricao}</p>
          <div className="mt-2 inline-block bg-[#1a0a0a] px-4 py-1 rounded text-xs text-zinc-400 border border-zinc-800">
             Como alcançar: <span className="text-white font-bold">{beneficioAtual.meta}</span>
          </div>
        </div>

        {/* Seleção de Níveis (Abas) */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-2 md:gap-4">
            {Object.entries(beneficios).map(([key, nivel]) => (
              <button
                key={key}
                onClick={() => setNivelSelecionado(key)}
                className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-bold text-xs md:text-sm transition-all transform hover:scale-105 ${
                  nivelSelecionado === key
                    ? 'bg-[#c5a059] text-[#280404] shadow-[0_0_15px_#c5a059] scale-105'
                    : 'bg-[#4d0808] border border-[#c5a059]/50 text-[#c5a059] hover:bg-[#c5a059]/20'
                }`}
              >
                {nivel.emoji} {nivel.nome}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {/* Pontos */}
          <div className="bg-[#4d0808] border-l-4 border-[#c5a059] p-6 md:p-8 rounded-r-xl shadow-xl">
            <h3 className="text-4xl md:text-5xl font-black text-white mb-1">{beneficioAtual.multiplicador}</h3>
            <p className="text-[#c5a059] font-bold text-xs uppercase tracking-widest">Pontos por Real</p>
            <p className="mt-4 text-zinc-200/80 text-sm">
              Use seus pontos para resgatar <span className="text-white font-bold">Pratos Deliciosos</span> ou <span className="text-white font-bold">Entrega Grátis</span>.
            </p>
          </div>

          {/* Cashback */}
          <div className="bg-[#4d0808] border-l-4 border-[#e31e24] p-6 md:p-8 rounded-r-xl shadow-xl">
            <h3 className="text-4xl md:text-5xl font-black text-white mb-1">{beneficioAtual.cashback}</h3>
            <p className="text-[#e31e24] font-bold text-xs uppercase tracking-widest">Cashback</p>
            <p className="mt-4 text-zinc-200/80 text-sm">
              Acumule saldo para descontos de <span className="font-bold text-white">R$ 5, R$ 10 ou R$ 15</span> na sua conta.
            </p>
          </div>

          {/* Tickets */}
          <div className="bg-[#4d0808] border-l-4 border-[#c5a059] p-6 md:p-8 rounded-r-xl shadow-xl">
            <h3 className="text-4xl md:text-5xl font-black text-white mb-1">{beneficioAtual.tickets.split(' ')[0]}</h3>
            <p className="text-[#c5a059] font-bold text-xs uppercase tracking-widest">Tickets da Roleta</p>
            <p className="mt-4 text-zinc-200/80 text-sm">
              Ganhe <span className="font-bold text-white">{beneficioAtual.tickets}</span> gastos para girar a roleta de prêmios.
            </p>
          </div>
        </div>

        {/* Banner do Rei */}
        {nivelSelecionado === 'REI_DO_CUPIM' && (
          <div className="mt-12 bg-gradient-to-r from-[#c5a059] to-[#e31e24] border-4 border-[#c5a059] rounded-xl p-8 text-center shadow-[0_0_30px_#c5a059] animate-pulse relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10">
                <h3 className="text-2xl md:text-4xl font-black text-[#280404] mb-2 uppercase italic transform -skew-x-12">
                    👑 Vossa Majestade!
                </h3>
                <p className="text-[#280404] font-bold text-lg">
                    Neste nível, cada pedido seu vale O DOBRO de um cliente prata.
                </p>
            </div>
          </div>
        )}
      </section>

      {/* CTA Final */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-[#4d0808] border border-black/20 rounded-xl p-8 md:p-10 text-center shadow-xl">
          <h3 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight">
            Deu fome? Peça agora!
          </h3>
          <p className="text-zinc-200/80 text-sm mb-8">
            Acumule pontos automaticamente pedindo pelo Delivery ou benefícios no Salão.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <a
              href="https://wa.me/5585988257044"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-[#280404] hover:bg-[#1a0a0a] border border-[#c5a059]/40 hover:border-[#c5a059] rounded-lg px-6 py-5 transition-all flex items-center justify-center gap-3"
            >
              <span className="font-black text-[#c5a059] group-hover:text-white transition-colors">WhatsApp</span>
            </a>

            <a
              href="https://www.instagram.com/oreidocupim_/"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-[#280404] hover:bg-[#1a0a0a] border border-[#c5a059]/40 hover:border-[#c5a059] rounded-lg px-6 py-5 transition-all flex items-center justify-center gap-3"
            >
              <span className="font-black text-[#c5a059] group-hover:text-white transition-colors">Instagram</span>
            </a>

            <a
              href="https://www.ifood.com.br/delivery/fortaleza-ce/churrascaria-o-rei-do-cupim-henrique-jorge/d4fc2476-227b-4fe1-87be-85a88bf5fee4"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-[#280404] hover:bg-[#1a0a0a] border border-[#c5a059]/40 hover:border-[#c5a059] rounded-lg px-6 py-5 transition-all flex items-center justify-center gap-3"
            >
              <span className="font-black text-[#c5a059] group-hover:text-white transition-colors">iFood</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-[#4d0808]/50 text-center bg-[#1a0a0a]">
  <p className="text-[#c5a059] italic font-medium">Sua Majestade em Qualidade e Sabor!</p>

  <div className="mt-4 text-[10px] text-zinc-600 uppercase tracking-[0.2em]">
    Fortaleza • Ceará
  </div>

  {/* BOTÃO ADMIN */}
  <div className="mt-6">
    <Link
      href="/admin"
      className="text-xs text-[#c5a059] opacity-40 hover:opacity-100 transition-all underline"
    >
      Área Administrativa
    </Link>
  </div>
</footer>
    </div>
  );
}