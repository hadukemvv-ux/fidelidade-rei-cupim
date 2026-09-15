import Image from 'next/image';
import Link from 'next/link';

const WHATSAPP_ATENDIMENTO = 'https://wa.me/5585988257044?text=Ol%C3%A1%2C%20quero%20falar%20sobre%20privacidade%20e%20meus%20dados%20no%20Clube%20O%20Rei%20do%20Cupim.';

export const metadata = {
  title: 'Privacidade | Clube O Rei do Cupim',
  description: 'Como o Clube O Rei do Cupim trata dados pessoais e como exercer seus direitos.',
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#120d0b] px-5 py-8 text-[#f7f0e8] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 flex items-center justify-between gap-4 border-b border-white/10 pb-6">
          <Link href="/" className="flex items-center gap-3 font-bold text-white hover:text-[#f4ce83]">
            <Image src="/logo.png" alt="O Rei do Cupim" width={42} height={42} />
            <span>Clube O Rei do Cupim</span>
          </Link>
          <Link href="/" className="text-sm font-bold text-[#f4ce83] hover:text-white">Voltar ao site</Link>
        </header>

        <article className="space-y-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl sm:p-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d6af62]">Transparência e privacidade</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Aviso de privacidade do Clube</h1>
            <p className="mt-4 leading-7 text-stone-300">Este aviso explica como o Clube O Rei do Cupim trata dados pessoais no programa de fidelidade. A versão pública do programa ainda está em preparação: novos tratamentos ou parceiros só serão ativados depois de revisão e atualização deste aviso.</p>
            <p className="mt-4 text-sm text-stone-400">Última atualização: 15 de setembro de 2026.</p>
          </div>

          <Section title="Quem é responsável pelos dados">
            <p>O controlador dos dados é O Rei do Cupim, em Fortaleza/CE. Para dúvidas, solicitações ou para exercer seus direitos, use nosso <a className="font-bold text-[#f4ce83] underline underline-offset-4" href={WHATSAPP_ATENDIMENTO} target="_blank" rel="noopener noreferrer">canal de privacidade no WhatsApp</a>. Pediremos apenas a confirmação necessária para proteger sua conta antes de atender uma solicitação.</p>
          </Section>

          <Section title="Quais dados podemos tratar">
            <ul className="list-disc space-y-2 pl-5">
              <li>nome, telefone e e-mail opcional para criar e manter sua conta;</li>
              <li>PIN protegido por criptografia de senha — nunca guardamos o PIN em texto legível;</li>
              <li>data de nascimento somente se você optar pela experiência de aniversário;</li>
              <li>saldo de pontos, resgates, cupons e histórico de compras relacionado ao Clube;</li>
              <li>registros técnicos mínimos de segurança, como data, hora e tentativas necessárias para prevenir fraude.</li>
            </ul>
          </Section>

          <Section title="Para que usamos esses dados">
            <ul className="list-disc space-y-2 pl-5">
              <li>operar sua conta, pontuação, recompensas, cupons e atendimento do programa;</li>
              <li>confirmar que quem acessa a conta é você e proteger o programa contra uso indevido;</li>
              <li>cumprir obrigações legais e manter evidências operacionais quando necessário;</li>
              <li>enviar a surpresa de aniversário ou promoções por WhatsApp somente quando você escolher receber essas mensagens.</li>
            </ul>
            <p className="mt-4">A participação no Clube não depende do aceite de promoções. Você pode retirar o consentimento de mensagens a qualquer momento pelo canal de privacidade.</p>
          </Section>

          <Section title="De onde vêm os dados e com quem podem ser compartilhados">
            <p>Os dados vêm de você e, quando a integração estiver aprovada e ativada, dos registros de compras do sistema Saipos para calcular benefícios do Clube. Para hospedar e proteger a aplicação, usamos provedores de infraestrutura e banco de dados, atualmente Vercel e Supabase. Uma futura confirmação ou comunicação por WhatsApp usará somente provedor oficial contratado e documentado antes de entrar em operação.</p>
            <p className="mt-4">Não vendemos dados pessoais. Também não usamos dados do Clube para uma finalidade incompatível com a informada neste aviso.</p>
          </Section>

          <Section title="Por quanto tempo guardamos">
            <p>Manteremos os dados enquanto sua conta estiver ativa e pelo tempo necessário para atender obrigações legais, resolver solicitações, prevenir fraude e comprovar operações de pontos e cupons. Antes do lançamento público, o Clube concluirá e publicará a tabela detalhada de retenção e descarte seguro. Dados sem necessidade serão eliminados ou anonimizados de forma segura.</p>
          </Section>

          <Section title="Seus direitos">
            <p>Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio ou eliminação quando aplicável, informação sobre compartilhamentos, portabilidade quando cabível e revisão das escolhas de consentimento. Para começar, fale pelo canal de privacidade e informe o telefone usado no Clube. Nunca envie PIN ou código de confirmação pelo WhatsApp.</p>
          </Section>

          <Section title="Segurança e incidentes">
            <p>Aplicamos controles de acesso por função, registros de auditoria, proteção de sessão e mecanismos de contenção para reduzir riscos. Se identificarmos um incidente com risco ou dano relevante, seguiremos o processo de resposta, preservaremos evidências e comunicaremos as pessoas e autoridades competentes conforme aplicável.</p>
          </Section>

          <Section title="Atualizações deste aviso">
            <p>Quando houver mudança relevante no tratamento dos dados, publicaremos uma versão atualizada aqui antes da ativação da nova funcionalidade. Este aviso não substitui uma análise jurídica individual; o programa passará por validação final de LGPD e operação antes de ser aberto ao público.</p>
          </Section>
        </article>
      </div>
    </main>
  );
}

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section>
      <h2 className="text-xl font-black text-white">{title}</h2>
      <div className="mt-3 leading-7 text-stone-300">{children}</div>
    </section>
  );
}
