'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link';

type Resultado = {
  processados: number;
  novos: number;
  atualizados: number;
};

export default function ImportarPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setFile(selected || null);
    setResultado(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setResultado(null);
    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const ws = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws);

      const response = await fetch('/api/admin/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });

      if (!response.ok) {
        throw new Error('Falha ao importar. Verifique o arquivo.');
      }

      const res = await response.json();
      setResultado(res);
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center">

      <div className="w-full max-w-xl bg-gray-800 border border-gray-700 p-8 rounded-2xl shadow-xl">

        <h1 className="text-3xl font-black text-[#c5a059] uppercase text-center mb-6">
          📥 Importar Planilha
        </h1>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="w-full bg-gray-700 p-3 border border-gray-600 rounded mb-4"
        />

        <button
          disabled={!file || loading}
          onClick={handleUpload}
          className={`w-full py-3 rounded font-bold text-black ${
            loading || !file
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-[#c5a059] hover:bg-[#b08d45]'
          }`}
        >
          {loading ? 'Processando…' : 'Enviar Arquivo'}
        </button>

        {error && (
          <div className="mt-4 text-red-400 text-center text-sm font-bold">
            ❌ {error}
          </div>
        )}

        {resultado && (
          <div className="mt-6 bg-gray-700 p-4 rounded text-green-400 text-sm font-bold">
            <p>Processados: {resultado.processados}</p>
            <p>Novos: {resultado.novos}</p>
            <p>Atualizados: {resultado.atualizados}</p>
          </div>
        )}

        <Link
          href="/admin"
          className="block text-center mt-6 py-3 rounded bg-gray-700 hover:bg-gray-600 font-bold text-white"
        >
          ⬅ Voltar ao Painel
        </Link>
      </div>
    </div>
  );
}