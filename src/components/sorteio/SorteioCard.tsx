'use client';

interface SorteioCardProps {
  titulo: string;
  descricao: string;
  imagemUrl: string;
  dataSorteio: string;
  modo: string;
  rodarAgora: () => void;
  rodando: boolean;
}

export default function SorteioCard({
  titulo,
  descricao,
  imagemUrl,
  dataSorteio,
  modo,
  rodarAgora,
  rodando
}: SorteioCardProps) {
  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl mb-10">

      <h2 className="text-xl font-bold text-[#c5a059] mb-4 flex items-center gap-2">
        📦 Prêmio Atual
      </h2>

      <div className="flex flex-col md:flex-row gap-6 items-start">

        <div className="w-full md:w-1/3">
          {imagemUrl ? (
            <img 
              src={imagemUrl} 
              alt="prêmio" 
              className="rounded-xl border border-gray-700 w-full object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-gray-700 rounded-xl flex items-center justify-center text-gray-400">
              Sem imagem
            </div>
          )}
        </div>

        <div className="flex-1">
          <p className="text-2xl font-black">{titulo || 'Sem título'}</p>
          <p className="text-gray-400 mt-2 whitespace-pre-line">{descricao || 'Sem descrição'}</p>

          <div className="mt-4 text-sm">
            <p><span className="font-bold text-[#c5a059]">Data:</span> {dataSorteio || 'Não definida'}</p>
            <p><span className="font-bold text-[#c5a059]">Modo:</span> {modo === 'manual' ? 'Manual' : 'Automático'}</p>
          </div>

          <button
            onClick={rodarAgora}
            disabled={rodando}
            className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold disabled:opacity-50"
          >
            {rodando ? 'Sorteando...' : '🎉 Rodar sorteio agora'}
          </button>
        </div>

      </div>
    </div>
  );
}