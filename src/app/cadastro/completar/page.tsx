import Link from 'next/link';

export default function CompletarCadastroPage() {
  return (
    <div className="min-h-screen bg-[#280404] text-white px-6 py-16 flex items-center justify-center">
      <div className="w-full max-w-md bg-[#4d0808] p-8 rounded-2xl border border-[#c5a059]/30 text-center shadow-2xl">
        <h1 className="text-2xl font-black mb-4 text-[#c5a059]">
          Confirmação necessária
        </h1>
        <p className="text-zinc-200 leading-relaxed">
          Seu cadastro já foi iniciado. Para proteger seus pontos, a conclusão precisa confirmar que o WhatsApp pertence a você.
        </p>
        <p className="mt-4 text-sm text-zinc-300">
          Enquanto a verificação segura por telefone não estiver disponível, procure o atendimento do restaurante.
        </p>
        <a
          href="https://wa.me/5585988257044"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 block w-full bg-[#c5a059] text-black font-black py-3 rounded-xl"
        >
          FALAR COM O RESTAURANTE
        </a>
        <Link href="/" className="mt-5 inline-block text-sm text-zinc-400 underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
