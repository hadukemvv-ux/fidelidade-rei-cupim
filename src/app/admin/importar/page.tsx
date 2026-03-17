'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link';

type Resultado = {
  processados: number;
  novos: number;
  atualizados: number;
  ignorados?: number;
};

export default function ImportarPage() {
  // ESTADOS PARA IMPORTAÇÃO DE VENDAS
  const [fileVendas, setFileVendas] = useState<File | null>(null);
  const [loadingVendas, setLoadingVendas] = useState(false);
  const [resultadoVendas, setResultadoVendas] = useState<Resultado | null>(null);

  // ESTADOS PARA IMPORTAÇÃO DE CLIENTES
  const [fileClientes, setFileClientes] = useState<File | null>(null);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [resultadoClientes, setResultadoClientes] = useState<Resultado | null>(null);

  const [error, setError] = useState<string | null>(null);

  const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN;

  const withAdminToken = (url: string) => {
    if (!adminToken) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(adminToken)}`;
  };

  const handleFileVendas = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFileVendas(selected);
    setResultadoVendas(null);
    setError(null);
  };

  const handleFileClientes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFileClientes(selected);
    setResultadoClientes(null);
    setError(null);
  };

  // --------------------------
  // IMPORTAÇÃO DE VENDAS
  // --------------------------
  const handleUploadVendas = async () => {
    if (!fileVendas) return;

    setLoadingVendas(true);
    setResultadoVendas(null);
    setError(null);

    try {
      const data = await fileVendas.arrayBuffer();
      const workbook = XLSX.read(data);
      const ws = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      const response = await fetch(withAdminToken('/api/admin/importar'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });

      const res = await response.json();
      const payload = res?.data ?? res;

      if (!response.ok) {
        throw new Error(res?.error || payload?.mensagem || 'Falha ao importar vendas.');
      }

      setResultadoVendas(payload);
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido.');
    } finally {
      setLoadingVendas(false);
    }
  };

  // --------------------------
  // IMPORTAÇÃO DE CLIENTES
  // --------------------------
  const handleUploadClientes = async () => {
    if (!fileClientes) return;

    setLoadingClientes(true);
    setResultadoClientes(null);
    setError(null);

    try {
      const data = await fileClientes.arrayBuffer();
      const workbook = XLSX.read(data);
      const ws = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      const response = await fetch(withAdminToken('/api/admin/importar-clientes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });

      const res = await response.json();
      const payload = res?.data ?? res;

      if (!response.ok) {
        throw new Error(res?.error || payload?.mensagem || 'Falha ao importar clientes.');
      }

      setResultadoClientes(payload);
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido.');
    } finally {
      setLoadingClientes(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center">

      <div className="w-full max-w-xl bg-gray-800 border border-gray-700 p-8 rounded-2xl shadow-xl">
        
        <h1 className="text-3xl font-black text-[#c5a059] uppercase text-center mb-6">
          📥 Importar Planilhas
        </h1>

        {/* ------------------- BLOCO IMPORTAR VENDAS ------------------- */}
        <h2 className="text-xl font-bold text-[#c5a059] mb-2">Vendas (Saipos)</h2>

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileVendas}
          className="w-full bg-gray-700 p-3 border border-gray-600 rounded mb-3"
        />

        <button
          disabled={!fileVendas || loadingVendas}
          onClick={handleUploadVendas}
          className={`w-full py-3 rounded font-bold text-black ${
            loadingVendas || !fileVendas
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-[#c5a059] hover:bg-[#b08d45]'
          }`}
        >
          {loadingVendas ? 'Processando Vendas…' : 'Importar Vendas'}
        </button>

        {resultadoVendas && (
          <div className="mt-4 bg-gray-700 p-4 rounded text-green-400 text-sm font-bold">
            <p>Processados: {resultadoVendas.processados}</p>
            <p>Novos: {resultadoVendas.novos}</p>
            <p>Atualizados: {resultadoVendas.atualizados}</p>
            {resultadoVendas.ignorados !== undefined && (
              <p>Ignorados: {resultadoVendas.ignorados}</p>
            )}
          </div>
        )}

        <hr className="my-6 border-gray-700" />

        {/* ------------------- BLOCO IMPORTAR CLIENTES ------------------- */}
        <h2 className="text-xl font-bold text-[#c5a059] mb-2">Clientes (Saipos)</h2>

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileClientes}
          className="w-full bg-gray-700 p-3 border border-gray-600 rounded mb-3"
        />

        <button
          disabled={!fileClientes || loadingClientes}
          onClick={handleUploadClientes}
          className={`w-full py-3 rounded font-bold text-black ${
            loadingClientes || !fileClientes
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-400'
          }`}
        >
          {loadingClientes ? 'Processando Clientes…' : 'Importar Clientes'}
        </button>

        {resultadoClientes && (
          <div className="mt-4 bg-gray-700 p-4 rounded text-blue-300 text-sm font-bold">
            <p>Processados: {resultadoClientes.processados}</p>
            <p>Novos: {resultadoClientes.novos}</p>
            <p>Atualizados: {resultadoClientes.atualizados}</p>
            {resultadoClientes.ignorados !== undefined && (
              <p>Ignorados: {resultadoClientes.ignorados}</p>
            )}
          </div>
        )}

        {/* ------------------- ERROS GERAIS ------------------- */}
        {error && (
          <div className="mt-4 text-red-400 text-center text-sm font-bold">
            ❌ {error}
          </div>
        )}

        {/* ------------------- VOLTAR ------------------- */}
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