'use client';

import { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';

export default function Validar() {
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cameraAberta, setCameraAberta] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Abre a câmera
  const abrirCamera = async () => {
    setCameraAberta(true);
    setErro(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      setErro('Não foi possível abrir a câmera. Permita o acesso.');
      setCameraAberta(false);
    }
  };

  // Fecha a câmera
  const fecharCamera = () => {
    setCameraAberta(false);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Escaneia o QR Code em tempo real
  useEffect(() => {
    if (!cameraAberta || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        if (imageData) {
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            // QR lido! Extrai dados (ex.: cupom e telefone da URL)
            const url = new URL(code.data);
            const cupomLido = url.searchParams.get('cupom');
            const telefoneLido = url.searchParams.get('telefone');

            if (cupomLido && telefoneLido) {
              setCodigo(cupomLido);
              setTelefone(telefoneLido);
              validarManual(cupomLido, telefoneLido); // Valida automaticamente
              fecharCamera(); // Fecha câmera após ler
            }
          }
        }
      }
      requestAnimationFrame(scan);
    };

    scan();

    return () => fecharCamera();
  }, [cameraAberta]);

  const [codigo, setCodigo] = useState('');
  const [telefone, setTelefone] = useState('');

  // Validação manual ou automática
  async function validarManual(cupomManual = codigo, telManual = telefone) {
    const cupomVal = cupomManual.trim().toUpperCase();
    const telVal = telManual.replace(/\D/g, '').trim();

    if (!cupomVal || !telVal) {
      setErro('Preencha o código e o telefone.');
      return;
    }

    setLoading(true);
    setErro(null);
    setResultado(null);

    try {
      const response = await fetch('/api/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cupom: cupomVal,
          telefone: telVal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || 'Cupom inválido ou já usado.');
        setLoading(false);
        return;
      }

      setResultado(data);
    } catch (e) {
      setErro('Erro de conexão. Tente novamente.');
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#2D1810] text-white flex items-center justify-center">
      <div className="max-w-md w-full px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">Validação de Cupom</h1>

        <div className="bg-white/5 p-6 rounded-2xl shadow-xl ring-1 ring-white/10 backdrop-blur">
          {!cameraAberta ? (
            <button
              onClick={abrirCamera}
              className="w-full rounded-xl bg-[#F4A261] py-4 font-bold text-[#2D1810] shadow-lg shadow-[#F4A261]/20 transition hover:bg-[#ffbc7a] mb-6"
            >
              Escanear QR Code com Câmera
            </button>
          ) : (
            <div className="mb-6">
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video ref={videoRef} autoPlay playsInline className="w-full" />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex gap-4 mt-4">
                <button
                  onClick={() => validarManual()}
                  className="flex-1 rounded-xl bg-[#F4A261] py-3 font-semibold text-[#2D1810] hover:bg-[#ffbc7a]"
                >
                  Validar Manualmente
                </button>

                <button
                  onClick={fecharCamera}
                  className="flex-1 rounded-xl bg-gray-600 py-3 font-semibold text-white hover:bg-gray-500"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Formulário manual */}
          <label className="block text-sm text-white/80 mb-2">Código do Cupom</label>
          <input
            type="text"
            placeholder="Ex.: RESGATE-PONTOS-ABC123XYZ"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[#F4A261]/60 focus:ring-2 focus:ring-[#F4A261]/25 mb-4"
          />

          <label className="block text-sm text-white/80 mb-2">Telefone do Cliente (11 dígitos)</label>
          <input
            type="tel"
            placeholder="Ex.: 85999999999"
            value={telefone}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              if (value.length <= 11) setTelefone(value);
            }}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[#F4A261]/60 focus:ring-2 focus:ring-[#F4A261]/25 mb-6"
          />

          <button
            onClick={() => validarManual()}
            disabled={loading}
            className="w-full rounded-xl bg-[#F4A261] py-4 font-bold text-[#2D1810] shadow-lg shadow-[#F4A261]/20 transition hover:bg-[#ffbc7a] disabled:opacity-60"
          >
            {loading ? 'Validando...' : 'Validar Cupom'}
          </button>

          {erro && (
            <div className="mt-6 rounded-xl border border-[#E63946]/30 bg-[#E63946]/10 p-4 text-center">
              <p className="text-[#ffd7d7]">{erro}</p>
            </div>
          )}

          {resultado && (
            <div className="mt-6 rounded-2xl border-2 border-green-500 bg-green-900/30 p-6 text-center">
              <p className="text-3xl font-bold text-green-400 mb-4">VÁLIDO!</p>
              <p className="text-xl text-white mb-2">
                {resultado.tipo === 'frete' ? 'Taxa de entrega grátis' : `R$ ${resultado.valorDesconto} de desconto`}
              </p>
              <p className="text-lg text-white/80">
                Cliente: {resultado.telefone}
              </p>
              <p className="text-sm text-white/60 mt-4">
                Aplique o cupom correspondente no pedido.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}