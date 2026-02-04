'use client';

interface Props {
  ganhadores: any[];
}

export default function GanhadoresList({ ganhadores }: Props) {
  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl mb-40">
      
      <h2 className="text-xl font-bold text-[#c5a059] mb-6">
        🏆 Últimos Ganhadores
      </h2>

      {ganhadores.length === 0 ? (
        <p className="text-gray-500">Nenhum ganhador registrado ainda.</p>
      ) : (
        <div className="space-y-4">
          {ganhadores.map((g: any) => (
            <div 
              key={g.id}
              className="p-4 bg-gray-900 rounded-xl border border-gray-700"
            >
              <p className="font-bold text-lg">{g.nome_cliente}</p>
              <p className="text-sm text-gray-400">{g.telefone_cliente}</p>

              <p className="text-sm mt-2">
                <span className="text-[#c5a059] font-bold">Tickets:</span> {g.tickets_no_sorteio}
              </p>

              <p className="text-sm text-gray-400 mt-1">
                {new Date(g.criado_em).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}