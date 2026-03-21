'use client';

import { fetchAdmin } from '@/lib/adminFetch';
import { useEffect, useState } from "react";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  async function carregarClientes() {
    setLoading(true);

    const res = await fetchAdmin('/api/admin/clientes');
    const dados = await res.json();
    const payload = dados?.data ?? dados;

    setClientes(payload?.clientes || payload || []);
    setLoading(false);
  }

  useEffect(() => {
    carregarClientes();
  }, []);

  const clientesFiltrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone?.includes(busca)
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Clientes</h1>

      {/* Barra de busca */}
      <input
        type="text"
        placeholder="Buscar por nome ou telefone..."
        className="border p-2 rounded w-full mb-4"
        value={busca}
        onChange={e => setBusca(e.target.value)}
      />

      {loading ? (
        <p>Carregando...</p>
      ) : (

        <div className="overflow-x-auto">
          <table className="w-full bg-white shadow rounded">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-3 text-left">Nome</th>
                <th className="p-3 text-left">Telefone</th>
                <th className="p-3 text-left">Nível</th>
                <th className="p-3 text-left">Pontos</th>
                <th className="p-3 text-left">Cashback</th>
                <th className="p-3 text-left">Tickets</th>
                <th className="p-3 text-left">Última Compra</th>
                <th className="p-3 text-left">Total Gasto</th>
              </tr>
            </thead>

            <tbody>
              {clientesFiltrados.map((c, i) => (
                <tr key={i} className="border-b hover:bg-gray-100">
                  <td className="p-3">{c.nome}</td>
                  <td className="p-3">{c.telefone || "-"}</td>
                  <td className="p-3 capitalize">{c.nivel}</td>
                  <td className="p-3">{c.pontos}</td>
                  <td className="p-3">R$ {(c.cashback || 0).toFixed(2)}</td>
                  <td className="p-3">{c.tickets}</td>
                  <td className="p-3">
                    {c.ultima_compra
                      ? new Date(c.ultima_compra).toLocaleString()
                      : "-"}
                  </td>
                  <td className="p-3">R$ {Number(c.total_gasto).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}