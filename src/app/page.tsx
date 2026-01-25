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
      descricao: 'Nível inicial. Ganhe o frete grátis no primeiro pedido!',
      manutencao: 'Grátis'
    },
    PRATA: {
      multiplicador: '7x',
      cashback: '1,00%',
      tickets: '2 a cada R$ 50',
      emoji: '🥈',
      nome: 'Prata',
      descricao: 'Para quem pede pelo menos 1x ao mês.',
      manutencao: 'Gastar R$ 70/mês'
    },
    OURO: {
      multiplicador: '10x',
      cashback: '2,00%',
      tickets: '3 a cada R$ 50',
      emoji: '🥇',
      nome: 'Ouro',
      descricao: 'Para quem pede 2x ao mês.',
      manutencao: 'Gastar R$ 150/mês'
    },
    REI_DO_CUPIM: {
      multiplicador: '14x',
      cashback: '3,00%',
      tickets: '4 a cada R$ 50',
      emoji: '👑',
      nome: 'Rei do Cupim',
      descricao: 'O nível máximo para os verdadeiros fãs!',
      manutencao: 'Gastar R$ 250/mês'
    }
  };

  const beneficioAtual = beneficios[nivelSelecionado as keyof typeof beneficios];

  return (
    <div className="min-h-screen bg-[#280404] text-white font-sans">
      {/* Header com a sua Logo Real */}
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
          Seja um verdadeiro Rei e transforme suas refeições em benefícios exclusivos
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

      {/* Benefícios em Porcentagem - Nível Selecionado */}
      <section className="max-w-6xl mx-auto py-16 px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-white uppercase tracking-[0.2em] mb-3">
            Níveis de Fidelidade
          </h2>
          <p className="text-zinc-300 text-sm">
            Mantenha seu gasto mensal para segurar seu nível e benefícios.
          </p>
          <p className="mt-6 text-[#c5a059] font-black text-xl animate-pulse">
             {beneficioAtual.emoji} {beneficioAtual.nome}
          </p>
          <p className="text-zinc-300 text-sm mt-1">{beneficioAtual.descricao}</p>
        </div>

        {/* Seleção de Níveis (Interativa) */}
        <div className="mb-8">
          <p className="text-zinc-200 text-sm mb-4 text-center">
            Clique nos níveis para ver os benefícios de cada um:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {Object.entries(beneficios).map(([key, nivel]) => (
              <button
                key={key}
                onClick={() => setNivelSelecionado(key)}
                className={`px-6 py-3 rounded-full font-bold text-sm transition-all transform hover:scale-105 ${
                  nivelSelecionado === key
                    ? 'bg-[#c5a059] text-[#280404] shadow-[0_0_15px_#c5a059]'
                    : 'bg-[#4d0808] border border-[#c5a059]/70 text-[#c5a059] hover:bg-[#c5a059]/20'
                }`}
              >
                {nivel.emoji} {nivel.nome}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Pontos */}
          <div className="bg-[#4d0808] border-l-4 border-[#c5a059] p-8 rounded-r-xl shadow-xl hover:shadow-2xl transition-shadow">
            <h3 className="text-4xl font-black text-white mb-1">{beneficioAtual.multiplicador}</h3>
            <p className="text-[#c5a059] font-bold text-xs uppercase tracking-widest">Pontos</p>
            <p className="mt-4 text-zinc-200/80 text-sm">
              Acumule <span className="font-bold">{beneficioAtual.multiplicador}</span> por cada real gasto.
            </p>
          </div>

          {/* Cashback */}
          <div className="bg-[#4d0808] border-l-4 border-[#e31e24] p-8 rounded-r-xl shadow-xl hover:shadow-2xl transition-shadow">
            <h3 className="text-4xl font-black text-white mb-1">{beneficioAtual.cashback}</h3>
            <p className="text-[#e31e24] font-bold text-xs uppercase tracking-widest">Cashback</p>
            <p className="mt-4 text-zinc-200/80 text-sm">
              Ganhe desconto direto no seu próximo pedido.
            </p>
          </div>

          {/* Tickets */}
          <div className="bg-[#4d0808] border-l-4 border-[#c5a059] p-8 rounded-r-xl shadow-xl hover:shadow-2xl transition-shadow">
            <h3 className="text-4xl font-black text-white mb-1">{beneficioAtual.tickets.split(' ')[0]}</h3>
            <p className="text-[#c5a059] font-bold text-xs uppercase tracking-widest">Tickets Sorteio</p>
            <p className="mt-4 text-zinc-200/80 text-sm">
              {beneficioAtual.tickets}. Concorra a prêmios mensais.
            </p>
          </div>
        </div>

        {/* Destaque Especial para Rei do Cupim */}
        {nivelSelecionado === 'REI_DO_CUPIM' && (
          <div className="mt-12 bg-gradient-to-r from-[#c5a059] to-[#e31e24] border-2 border-[#c5a059] rounded-xl p-8 text-center shadow-2xl animate-pulse">
            <h3 className="text-3xl font-black text-[#280404] mb-2">👑 O REI DO CUPIM 👑</h3>
            <p className="text-[#280404] font-bold"> Você alcançou o nivel maximo. Parabéns NOSSO Rei 👑</p>
          </div>
        )}
      </section>

      {/* ✅ NOVO: Seção "Peça agora" (alta conversão) */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-[#4d0808] border border-black/20 rounded-xl p-8 md:p-10 text-center shadow-xl">
          <h3 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight">
            Peça agora e ganhe benefícios
          </h3>
          <p className="text-zinc-200/80 text-sm mb-8">
            Fale com a gente no WhatsApp, acompanhe novidades no Instagram ou peça no iFood.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {/* WhatsApp */}
            <a
              href="https://wa.me/5585988257044"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-[#280404] hover:bg-[#1a0a0a] border border-[#c5a059]/40 hover:border-[#c5a059] rounded-lg px-6 py-5 transition-all flex items-center justify-center gap-3"
              aria-label="Pedir pelo WhatsApp"
              title="Pedir pelo WhatsApp"
            >
              <span className="text-[#c5a059] group-hover:text-white transition-colors">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.55C8.75 21.33 10.36 21.78 12.04 21.78C17.5 21.78 21.95 17.33 21.95 11.87C21.95 6.41 17.5 2 12.04 2ZM12.04 20.13C10.56 20.13 9.12 19.73 7.89 19L7.5 18.78L4.42 19.57L5.23 16.59L4.97 16.19C4.12 14.83 3.68 13.29 3.68 11.76C3.68 7.36 7.45 3.6 11.9 3.6C16.35 3.6 20.13 7.36 20.13 11.82C20.13 16.28 16.35 20.13 11.9 20.13H12.04Z" />
                  <path d="M16.54 14.53c-.24-.12-1.41-.68-1.63-.76-.22-.08-.38-.12-.53.12-.16.24-.65.84-.81 1.02-.16.18-.31.22-.57.1-.26-.12-1.09-.4-2.09-1.29-.78-.71-1.3-1.59-1.46-1.83-.15-.24-.02-.39.1-.51.11-.11.26-.31.38-.47.12-.15.16-.27.24-.45.08-.18.04-.33-.04-.45-.08-.12-.6-1.41-.83-1.97-.22-.56-.44-.48-.58-.48h-.55c-.2 0-.52.08-.8.36-.27.28-.87.8-.87 1.97s.91 2.28 1.03 2.44c.12.16 1.81 2.76 4.32 3.84.57.25.98.39 1.31.51.59.19 1.09.15 1.49.05.46-.11 1.48-.71 1.69-1.3.2-.59.2-1.1.12-1.22-.08-.12-.16-.16-.32-.28z" />
                </svg>
              </span>
              <span className="font-black text-[#c5a059] group-hover:text-white transition-colors">
                WhatsApp
              </span>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/oreidocupim_/"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-[#280404] hover:bg-[#1a0a0a] border border-[#c5a059]/40 hover:border-[#c5a059] rounded-lg px-6 py-5 transition-all flex items-center justify-center gap-3"
              aria-label="Ver Instagram"
              title="Ver Instagram"
            >
              <span className="text-[#c5a059] group-hover:text-white transition-colors">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5z" />
                  <path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" />
                  <path d="M17.25 6.25a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                </svg>
              </span>
              <span className="font-black text-[#c5a059] group-hover:text-white transition-colors">
                Instagram
              </span>
            </a>

            {/* iFood - Agora com PNG */}
            <a
              href="https://www.ifood.com.br/delivery/fortaleza-ce/churrascaria-o-rei-do-cupim-henrique-jorge/d4fc2476-227b-4fe1-87be-85a88bf5fee4"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-[#280404] hover:bg-[#1a0a0a] border border-[#c5a059]/40 hover:border-[#c5a059] rounded-lg px-6 py-5 transition-all flex items-center justify-center gap-3"
              aria-label="Pedir no iFood"
              title="Pedir no iFood"
            >
              <img src="/ifood.png" alt="iFood" className="w-7 h-7 object-contain" />
              <span className="font-black text-[#c5a059] group-hover:text-white transition-colors">
                iFood
              </span>
            </a>
          </div>

          <p className="mt-8 text-zinc-200/70 text-xs">
            Dica: se você já é cliente, clique em <span className="font-bold text-white">Consultar Pontos</span>.
          </p>
        </div>
      </section>

      {/* Rodapé com Ícones (dourado -> branco no hover) */}
      <footer className="py-16 px-6 border-t border-[#4d0808]/50 text-center bg-[#1a0a0a]">
        <p className="text-2xl font-black text-white mb-2 tracking-tighter">
          CHURRASCARIA <span className="text-[#e31e24]">O REI DO CUPIM</span>
        </p>

        <p className="text-[#c5a059] italic font-medium mb-10">
          Sua Majestade em Qualidade e Sabor!
        </p>

        <div className="flex justify-center gap-8 mb-10">
          {/* WhatsApp */}
          <a
            href="https://wa.me/5585988257044"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#c5a059] hover:text-white transition-colors transform hover:scale-110"
            aria-label="WhatsApp"
            title="WhatsApp"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.55C8.75 21.33 10.36 21.78 12.04 21.78C17.5 21.78 21.95 17.33 21.95 11.87C21.95 6.41 17.5 2 12.04 2ZM12.04 20.13C10.56 20.13 9.12 19.73 7.89 19L7.5 18.78L4.42 19.57L5.23 16.59L4.97 16.19C4.12 14.83 3.68 13.29 3.68 11.76C3.68 7.36 7.45 3.6 11.9 3.6C16.35 3.6 20.13 7.36 20.13 11.82C20.13 16.28 16.35 20.13 11.9 20.13H12.04Z" />
              <path d="M16.54 14.53c-.24-.12-1.41-.68-1.63-.76-.22-.08-.38-.12-.53.12-.16.24-.65.84-.81 1.02-.16.18-.31.22-.57.1-.26-.12-1.09-.4-2.09-1.29-.78-.71-1.3-1.59-1.46-1.83-.15-.24-.02-.39.1-.51.11-.11.26-.31.38-.47.12-.15.16-.27.24-.45.08-.18.04-.33-.04-.45-.08-.12-.6-1.41-.83-1.97-.22-.56-.44-.48-.58-.48h-.55c-.2 0-.52.08-.8.36-.27.28-.87.8-.87 1.97s.91 2.28 1.03 2.44c.12.16 1.81 2.76 4.32 3.84.57.25.98.39 1.31.51.59.19 1.09.15 1.49.05.46-.11 1.48-.71 1.69-1.3.2-.59.2-1.1.12-1.22-.08-.12-.16-.16-.32-.28z" />
            </svg>
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/oreidocupim_/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#c5a059] hover:text-white transition-colors transform hover:scale-110"
            aria-label="Instagram"
            title="Instagram"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5z" />
              <path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" />
              <path d="M17.25 6.25a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
            </svg>
          </a>

          {/* iFood - Agora com PNG */}
          <a
            href="https://www.ifood.com.br/delivery/fortaleza-ce/churrascaria-o-rei-do-cupim-henrique-jorge/d4fc2476-227b-4fe1-87be-85a88bf5fee4"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#c5a059] hover:text-white transition-colors transform hover:scale-110"
            aria-label="iFood"
            title="iFood"
          >
            <img src="/ifood.png" alt="iFood" className="w-8 h-8 object-contain" />
          </a>
        </div>

        <div className="text-[10px] text-zinc-600 uppercase tracking-[0.8em]">
          Fortaleza • Ceará
        </div>
      </footer>
    </div>
  );
}