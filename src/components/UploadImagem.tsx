'use client';

import { useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UploadImagem({ onUpload }: { onUpload: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  function selecionarArquivo() {
    fileRef.current?.click();
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivo(file);
    setPreview(URL.createObjectURL(file));
  }

  async function enviar() {
    if (!arquivo) return;

    setUploading(true);

    try {
      const ext = arquivo.name.split('.').pop();
      const nome = `premio_${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('sorteios')
        .upload(nome, arquivo);

      if (error) {
        alert("Erro ao enviar imagem.");
        console.error(error);
        return;
      }

      const urlPublica =
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sorteios/${nome}`;

      onUpload(urlPublica);

    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-4">

      {/* PREVIEW */}
      <div className="w-full h-48 bg-black/30 border border-gray-700 rounded-xl flex items-center justify-center overflow-hidden">
        {preview ? (
          <img src={preview} className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-500 text-sm">Nenhuma imagem selecionada</span>
        )}
      </div>

      {/* BOTÃO DE SELEÇÃO */}
      <button
        onClick={selecionarArquivo}
        className="
          w-full py-3 rounded-lg
          bg-[#c5a059] text-black font-bold
          hover:bg-[#b08d45] active:scale-95
          transition-all shadow-lg
        "
      >
        📁 Selecionar Imagem
      </button>

      <input 
        type="file" 
        ref={fileRef}
        onChange={handleInput}
        accept="image/*"
        className="hidden"
      />

      {/* BOTÃO DE UPLOAD */}
      <button
        disabled={!arquivo || uploading}
        onClick={enviar}
        className="
          w-full py-3 rounded-lg
          bg-green-600 text-white font-bold
          hover:bg-green-500 active:scale-95
          transition-all shadow-lg
          disabled:bg-green-900 disabled:cursor-not-allowed
        "
      >
        {uploading ? "Enviando..." : "Enviar Imagem"}
      </button>

    </div>
  );
}