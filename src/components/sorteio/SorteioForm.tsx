'use client';

import UploadImagem from '@/components/UploadImagem';

interface Props {
  titulo: string;
  setTitulo: (v: string) => void;

  descricao: string;
  setDescricao: (v: string) => void;

  imagemUrl: string;
  setImagemUrl: (v: string) => void;

  dataSorteio: string;
  setDataSorteio: (v: string) => void;

  // 🔥 TIPAGEM CORRIGIDA
  modo: "manual" | "automatico";
  setModo: React.Dispatch<React.SetStateAction<"manual" | "automatico">>;

  salvar: () => void;
  saving: boolean;
}

export default function SorteioForm({
  titulo, setTitulo,
  descricao, setDescricao,
  imagemUrl, setImagemUrl,
  dataSorteio, setDataSorteio,
  modo, setModo,
  salvar, saving
}: Props) {

  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl mb-10">

      <h2 className="text-xl font-bold text-[#c5a059] mb-4">🛠 Editar Prêmio</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div>
          <label className="text-xs font-bold text-gray-400">Título</label>
          <input 
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white mt-1"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400">Data do Sorteio</label>
          <input 
            type="date"
            value={dataSorteio}
            onChange={e => setDataSorteio(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white mt-1"
          />
        </div>

        <div className="col-span-2">
          <UploadImagem
            onUpload={(url: string) => setImagemUrl(url)}
          />
        </div>

        <div className="col-span-2">
          <label className="text-xs font-bold text-gray-400">Descrição</label>
          <textarea 
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            rows={4}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white mt-1"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400">Modo</label>
          <select
            value={modo}
            onChange={e => setModo(e.target.value as "manual" | "automatico")}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white mt-1"
          >
            <option value="manual">Manual</option>
            <option value="automatico">Automático</option>
          </select>
        </div>

      </div>

      <button
        onClick={salvar}
        disabled={saving}
        className="mt-6 px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold disabled:opacity-50"
      >
        {saving ? 'Salvando...' : '💾 Salvar alterações'}
      </button>

    </div>
  );
}