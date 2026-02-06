'use client';
import { useState, useRef, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';

// --- SONS ---
const SOM_GIRO = 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_736a7e0825.mp3?filename=wheel-spin-click-96264.mp3'; 
const SOM_VITORIA = 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=success-1-6297.mp3';
const SOM_DERROTA = 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=fail-144746.mp3';

function getNivelInfo(senha: string) {
    if (!senha || senha.length < 4) return { texto: 'Desconhecido', cor: 'text-zinc-500', valor: 'R$ ?', bg: 'bg-zinc-800' };
    const final = senha.slice(2, 4);
    if (final === '03') return { texto: 'OURO ⭐', cor: 'text-[#ffd700]', valor: 'Acima de R$ 300', bg: 'bg-[#ffd700]/10 border-[#ffd700]/30' };
    if (final === '02') return { texto: 'PRATA 🥈', cor: 'text-gray-300', valor: 'Acima de R$ 200', bg: 'bg-white/10 border-white/30' };
    return { texto: 'BRONZE 🥉', cor: 'text-[#cd7f32]', valor: 'Acima de R$ 100', bg: 'bg-[#cd7f32]/10 border-[#cd7f32]/30' };
}

export default function RoletaPage() {
  const [fase, setFase] = useState<'garcom' | 'confirmacao_garcom' | 'cliente' | 'roleta'>('garcom');
  const [senhaGarcom, setSenhaGarcom] = useState('');
  const [dadosGarcom, setDadosGarcom] = useState<any>(null);
  const [telefone, setTelefone] = useState('');
  const [itensRoda, setItensRoda] = useState<any[]>([]);
  const [loadingPremios, setLoadingPremios] = useState(true);
  const [girando, setGirando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const rodaRef = useRef<HTMLDivElement>(null);

  const audioGiro = useRef<HTMLAudioElement | null>(null);
  const audioVitoria = useRef<HTMLAudioElement | null>(null);
  const audioDerrota = useRef<HTMLAudioElement | null>(null);

  const nivelInfo = getNivelInfo(senhaGarcom);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        audioGiro.current = new Audio(SOM_GIRO);
        audioVitoria.current = new Audio(SOM_VITORIA);
        audioDerrota.current = new Audio(SOM_DERROTA);
        if(audioGiro.current) audioGiro.current.loop = true;
    }

    async function fetchPremios() {
        try {
            const res = await fetch('/api/roleta/premios');
            if (res.ok) {
                const data = await res.json();
                if (!Array.isArray(data) || data.length === 0) { setItensRoda([]); return; }
                const total = 360;
                const fatia = total / data.length;
                const mapeados = data.map((p: any, i: number) => ({
                    ...p,
                    inicio: i * fatia,
                    fim: (i + 1) * fatia,
                    textoBranco: true 
                }));
                setItensRoda(mapeados);
            }
        } catch (e) { console.error(e); } finally { setLoadingPremios(false); }
    }
    fetchPremios();
  }, []);

  const backgroundGradient = useMemo(() => {
    if (itensRoda.length === 0) return '#1a0a0a';
    return `conic-gradient(${itensRoda.map(item => `${item.cor} ${item.inicio}deg ${item.fim}deg`).join(', ')})`;
  }, [itensRoda]);

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    if (v.length > 9) v = `${v.slice(0, 10)}-${v.slice(10)}`;
    setTelefone(v);
  };

  async function validarSenhaGarcom() {
    if (senhaGarcom.length !== 4) return alert('Senha inválida.');
    try {
        const res = await fetch('/api/garcons/validar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha: senhaGarcom })
        });
        const data = await res.json();
        if (data.error) alert(data.error);
        else { setDadosGarcom(data); setFase('confirmacao_garcom'); }
    } catch { alert('Erro de conexão.'); }
  }

  async function girarRoleta() {
    if (itensRoda.length === 0 || girando) return;
    setGirando(true);
    setResultado(null);
    if (audioGiro.current) { audioGiro.current.currentTime = 0; audioGiro.current.play().catch(()=>{}); }

    try {
      const res = await fetch('/api/roleta/girar', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_telefone: telefone.replace(/\D/g, ''), garcom_id: senhaGarcom })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Busca o item visual pelo NOME que veio do banco
      const itemVisual = itensRoda.find(i => i.nome === data.premio.nome) || itensRoda[0];
      const centroFatia = itemVisual.inicio + ((itemVisual.fim - itemVisual.inicio) / 2);
      const voltas = 5 * 360; 
      const rotacaoFinal = voltas + (360 - centroFatia);

      if (rodaRef.current) {
        rodaRef.current.style.transition = 'transform 6s cubic-bezier(0.15, 0, 0.10, 1)'; 
        rodaRef.current.style.transform = `rotate(${rotacaoFinal}deg)`;
      }

      setTimeout(() => {
        if (audioGiro.current) { audioGiro.current.pause(); audioGiro.current.currentTime = 0; }
        setResultado(data);
        setGirando(false);
        if (data.premio.tipo !== 'nada') {
           if (audioVitoria.current) audioVitoria.current.play().catch(()=>{});
           confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, colors: ['#c5a059', '#e31e24', '#ffffff'] });
        } else { if (audioDerrota.current) audioDerrota.current.play().catch(()=>{}); }
      }, 6000);
    } catch (error: any) { alert(error.message); setGirando(false); }
  }

  if (loadingPremios) return <div className="min-h-screen bg-[#280404] flex items-center justify-center text-[#c5a059] font-bold animate-pulse uppercase tracking-widest">Sincronizando Roleta...</div>;

  if (fase === 'garcom') {
    return (
      <div className="min-h-screen bg-[#280404] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="bg-[#1a0a0a] border border-[#c5a059] p-8 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden">
            <h1 className="text-2xl text-[#c5a059] font-black mb-4 uppercase tracking-wider">Área do Garçom</h1>
            <input type="tel" maxLength={4} value={senhaGarcom} onChange={(e) => setSenhaGarcom(e.target.value)} className="bg-[#280404] text-white text-3xl text-center p-4 rounded-xl border border-[#c5a059]/30 focus:border-[#c5a059] w-full tracking-[10px] mb-6 outline-none shadow-inner placeholder-zinc-700" placeholder="••••" />
            <button onClick={validarSenhaGarcom} className="w-full bg-[#e31e24] hover:bg-[#c1191f] text-white font-black py-4 rounded-xl shadow-[0_4px_0_#8a0f12] active:translate-y-1 active:shadow-none transition-all">VALIDAR</button>
        </div>
      </div>
    );
  }

  if (fase === 'confirmacao_garcom') {
    return (
      <div className="min-h-screen bg-[#280404] flex flex-col items-center justify-center p-6 text-center font-sans animate-fade-in">
        <div className={`bg-[#1a0a0a] border-2 ${nivelInfo.cor.replace('text-', 'border-')} p-8 rounded-2xl w-full max-w-sm shadow-2xl relative`}>
            <h2 className="text-3xl text-white font-black mb-6">{dadosGarcom?.nome}</h2>
            <div className={`${nivelInfo.bg} p-4 rounded-xl mb-6 border`}>
                <p className={`text-2xl font-black ${nivelInfo.cor} mb-1 drop-shadow-sm`}>{nivelInfo.texto}</p>
                <p className="text-xs text-white/70 font-bold">{nivelInfo.valor}</p>
            </div>
            <button onClick={() => setFase('cliente')} className="w-full bg-[#c5a059] hover:bg-[#b08d45] text-black font-black py-4 rounded-xl mb-3 shadow-[0_4px_0_#8a6d2b] active:translate-y-1 active:shadow-none transition-all">CONFIRMAR ✅</button>
            <button onClick={() => setFase('garcom')} className="w-full text-zinc-500 font-bold py-2 text-xs hover:text-white">Voltar</button>
        </div>
      </div>
    );
  }

  if (fase === 'cliente') {
    return (
      <div className="min-h-screen bg-[#280404] flex flex-col items-center justify-center p-6 text-center font-sans animate-fade-in">
        <div className="max-w-sm w-full">
            <h1 className="text-3xl text-white font-black mb-2 uppercase">Cliente</h1>
            <input type="tel" placeholder="(11) 99999-9999" value={telefone} onChange={handleTelefoneChange} maxLength={15} className="bg-[#1a0a0a] text-white text-2xl text-center p-4 rounded-xl w-full mb-6 font-bold border border-[#c5a059]/30 focus:border-[#c5a059] outline-none shadow-lg placeholder-zinc-700" />
            <button onClick={() => { if(telefone.replace(/\D/g, '').length === 11) setFase('roleta'); else alert('Telefone inválido'); }} className="w-full bg-[#e31e24] hover:bg-[#c1191f] text-white font-black py-4 rounded-xl shadow-[0_4px_0_#8a0f12] active:translate-y-1 active:shadow-none transition-all uppercase tracking-wider">Ir para Sorteio 🎲</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#280404] flex flex-col items-center justify-center p-4 overflow-hidden font-sans relative">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_#4d0808_0%,_#280404_70%)] -z-10"></div>
      <h1 className="text-4xl md:text-5xl font-black text-[#c5a059] mb-8 text-center uppercase tracking-widest drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]">Roleta do Rei</h1>
      <div className="relative w-[340px] h-[340px] md:w-[480px] md:h-[480px] mb-12">
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 w-16 h-20 flex justify-center filter drop-shadow-xl"><div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[50px] border-t-white"></div></div>
        <div ref={rodaRef} className="w-full h-full rounded-full relative shadow-[0_0_50px_rgba(0,0,0,0.8)] border-[12px] border-[#1a0a0a] overflow-hidden" style={{ background: backgroundGradient }}>
          {itensRoda.map((item) => {
            const anguloMeio = item.inicio + ((item.fim - item.inicio) / 2);
            return (
              <div key={item.id} className="absolute top-0 left-1/2 h-1/2 w-[1px] origin-bottom flex justify-center pt-5" style={{ transform: `rotate(${anguloMeio}deg)` }}>
                <div className={`whitespace-nowrap font-bold uppercase flex flex-col items-center -translate-y-1 ${item.textoBranco ? 'text-white' : 'text-black'}`}>
                  <span className="text-3xl md:text-4xl filter drop-shadow-md transform rotate-180 mb-1">{item.emoji || '🎁'}</span>
                  <span className="leading-none text-center font-black drop-shadow-sm text-[10px] md:text-xs w-24 whitespace-normal break-words" style={{ transform: 'rotate(180deg)' }}>{item.nome}</span>
                </div>
              </div>
            );
          })}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-[#1a0a0a] rounded-full border-4 border-[#c5a059] flex items-center justify-center shadow-lg z-10 overflow-hidden p-2"><img src="/logo.png" alt="Logo" className="w-full h-full object-contain" /></div>
        </div>
      </div>
      {!resultado && (
        <button onClick={girarRoleta} disabled={girando || itensRoda.length === 0} className="bg-gradient-to-b from-[#c5a059] to-[#9a7d3a] text-black font-black text-2xl py-4 px-16 rounded-full shadow-[0_6px_0_#5e491c] active:translate-y-1 active:shadow-none disabled:opacity-50 hover:scale-105 transition-transform border-2 border-[#ffd700]/50 uppercase tracking-widest">{girando ? 'GIRANDO...' : 'GIRAR AGORA!'}</button>
      )}
      {resultado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
           <div className="bg-[#280404] border-2 border-[#c5a059] p-8 rounded-3xl w-full max-w-sm text-center shadow-[0_0_50px_rgba(197,160,89,0.2)] relative overflow-hidden">
                <div className="text-8xl animate-bounce mb-6 filter drop-shadow-lg">{resultado.premio.emoji || '🎁'}</div>
                <h2 className="text-3xl font-black text-white uppercase mb-2">{resultado.premio.tipo === 'nada' ? 'Que pena!' : 'PARABÉNS!'}</h2>
                <p className="text-lg text-[#c5a059] font-bold leading-tight mb-6 px-4">
                    {resultado.premio.descricao_vitoria || (resultado.premio.tipo === 'nada' ? 'Não foi dessa vez. Tente na próxima!' : `Você ganhou: ${resultado.premio.nome}`)}
                </p>
                <button onClick={() => window.location.reload()} className="w-full bg-[#e31e24] text-white font-black py-4 rounded-xl hover:bg-[#c1191f] shadow-[0_4px_0_#8a0f12] active:translate-y-1 active:shadow-none transition-all uppercase">Próximo Cliente</button>
           </div>
        </div>
      )}
    </div>
  );
}