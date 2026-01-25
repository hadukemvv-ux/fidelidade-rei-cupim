'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Scanner } from '@yudiel/react-qr-scanner'; 

function ValidarContent() {
  const searchParams = useSearchParams();
  // ✅ CORREÇÃO AQUI: searchParams?.get()
  const cupomUrl = searchParams?.get('cupom');
  
  const [cupom, setCupom] = useState(cupomUrl || '');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false); 

  useEffect(() => {
    if (cupomUrl) {
      verificarCupom(cupomUrl);
    }
  }, [cupomUrl]);

  async function verificarCupom(codigo: string) {
    if (!codigo) return;
    
    // Normaliza
    const codigoLimpo = codigo.trim().toUpperCase();

    setLoading(true);
    setResultado(null);
    setShowScanner(false); 
    setCupom(codigoLimpo); 

    try {
      const res = await fetch('/api/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cupom: codigoLimpo, acao: 'consultar' }),
      });
      const data = await res.json();
      setResultado(data);
    } catch (error) {
      setResultado({ ok: false, error: 'Erro de conexão.' });
    } finally {
      setLoading(false);
    }
  }

  async function confirmarUso() {
    if (!confirm('Tem certeza que deseja marcar este cupom como USADO? A ação não pode ser desfeita.')) return;

    setLoading(true);
    try {
      const res = await fetch('/api/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cupom, acao: 'baixar' }),
      });
      const data = await res.json();
      if (data.ok) {
        alert('SUCESSO! Cupom baixado.');
        setResultado(null);
        setCupom('');
      } else {
        alert('Erro: ' + data.error);
      }
    } catch (error) {
      alert('Erro ao processar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center justify-center font-sans">
      <div className="max-w-md w-full bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
        <h1 className="text-2xl font-bold text-center mb-6 text-[#c5a059]">🛡️ Validação de Cupom</h1>

        {/* Botão para abrir Scanner */}
        {!showScanner && !resultado && (
          <button
            onClick={() => setShowScanner(true)}
            className="w-full bg-[#c5a059] hover:bg-[#a08040] text-black font-bold py-4 rounded-lg mb-6 flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
          >
            📷 Ler QR Code com Câmera
          </button>
        )}

        {/* Scanner de Câmera */}
        {showScanner && (
          <div className="mb-6 bg-black rounded-lg overflow-hidden relative border-4 border-[#c5a059]">
            <Scanner
              onScan={(result) => {
                if (result && result.length > 0) {
                  const rawValue = result[0].rawValue;
                  console.log('Lido:', rawValue);

                  let codigoFinal = rawValue;
                  
                  if (rawValue.includes('cupom=')) {
                    codigoFinal = rawValue.split('cupom=')[1].split('&')[0];
                  }
                  
                  verificarCupom(codigoFinal);
                }
              }}
              onError={(error) => console.log('Erro Câmera:', error)}
              styles={{ container: { width: '100%', aspectRatio: '1/1' } }}
              components={{ audio: false }} 
            />
            <button 
              onClick={() => setShowScanner(false)}
              className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded text-xs z-10 font-bold shadow-sm"
            >
              FECHAR X
            </button>
            <p className="absolute bottom-2 left-0 right-0 text-center text-white text-xs bg-black/50 py-1">
              Aponte para o QR Code do cliente
            </p>
          </div>
        )}

        {/* Input Manual */}
        <div className="flex gap-2 mb-6">
          <input
            value={cupom}
            onChange={(e) => setCupom(e.target.value.toUpperCase())}
            placeholder="Ou digite o código..."
            className="flex-1 bg-gray-900 border border-gray-600 rounded p-3 text-center font-mono uppercase tracking-widest focus:border-[#c5a059] outline-none"
          />
          <button
            onClick={() => verificarCupom(cupom)}
            disabled={loading || !cupom}
            className="bg-blue-600 hover:bg-blue-700 px-4 rounded font-bold disabled:opacity-50"
          >
            🔍
          </button>
        </div>

        {loading && <p className="text-center text-gray-400 animate-pulse">Verificando sistema...</p>}

        {resultado && (
          <div className={`text-center p-6 rounded-xl border-4 ${resultado.ok ? 'bg-green-900/50 border-green-500' : 'bg-red-900/50 border-red-500'}`}>
            
            <div className="text-6xl mb-4">
              {resultado.ok ? '✅' : '🚫'}
            </div>

            <h2 className="text-3xl font-black mb-2">
              {resultado.ok ? 'CUPOM VÁLIDO' : 'INVÁLIDO / USADO'}
            </h2>

            {!resultado.ok ? (
              <p className="text-red-200 font-bold text-lg">{resultado.mensagem || resultado.error}</p>
            ) : (
              <div className="space-y-4">
                <div className="bg-black/30 p-4 rounded-lg border border-white/10">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Benefício a Entregar:</p>
                  <p className="text-2xl font-bold text-[#c5a059] leading-tight">{resultado.detalhes.descricao_amigavel}</p>
                </div>

                <div className="text-sm text-gray-300 bg-black/20 p-2 rounded">
                  <p>👤 {resultado.detalhes.telefone}</p>
                  <p>📅 {new Date(resultado.detalhes.criado_em).toLocaleString('pt-BR')}</p>
                </div>

                <button
                  onClick={confirmarUso}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-lg text-xl shadow-[0_4px_0_#166534] mt-4 transform active:translate-y-1 active:shadow-none transition-all"
                >
                  CONFIRMAR ENTREGA
                </button>
              </div>
            )}
            
            <button
              onClick={() => { setResultado(null); setCupom(''); }}
              className="mt-6 text-gray-400 hover:text-white underline text-sm block w-full"
            >
              Nova Consulta
            </button>
          </div>
        )}
      </div>
      
      <p className="mt-8 text-gray-500 text-xs">Área restrita à equipe Rei do Cupim</p>
    </div>
  );
}

export default function ValidarPage() {
  return (
    <Suspense fallback={<div className="text-white text-center p-10">Carregando validador...</div>}>
      <ValidarContent />
    </Suspense>
  );
}