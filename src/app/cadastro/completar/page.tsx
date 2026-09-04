import Link from 'next/link';

export default function CompletarCadastroPage() {
  return (
    <div className="portal-page portal-static min-h-screen bg-[#280404] text-white px-6 py-16 flex items-center justify-center">
      <div className="w-full max-w-md bg-[#4d0808] p-8 rounded-2xl border border-[#c5a059]/30 text-center shadow-2xl">
        <h1 className="text-2xl font-black mb-4 text-[#c5a059]">
          Confirmação necessária
        </h1>
        <p className="text-zinc-200 leading-relaxed">
          Seu cadastro já foi iniciado. Para proteger seus pontos, a conclusão precisa confirmar que o WhatsApp pertence a você.
        </p>
        <p className="mt-4 text-sm text-zinc-300">
          Enviaremos um código pelo WhatsApp somente para esta confirmação. Depois, seus acessos serão feitos com telefone e PIN.
        </p>
        <Link
          href="/cadastro"
          className="mt-7 block w-full bg-[#c5a059] text-black font-black py-3 rounded-xl"
        >
          CONFIRMAR MEU WHATSAPP
        </Link>
        <Link href="/" className="mt-5 inline-block text-sm text-zinc-400 underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
