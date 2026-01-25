'use client';
import { useState, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';

// --- CONFIGURAÇÃO VISUAL DA RODA ---
const FATIA_PS5 = 5; 
const RESTANTE = 360 - FATIA_PS5;
const FATIA_NORMAL = RESTANTE / 7; 

// Itens visuais da roleta (ID é a chave para o mapeamento)
const ITENS_RODA = [
  { id: 'ps5', nome: 'PLAYSTATION!!!', emoji: '🎮', cor: '#2563eb', inicio: 0, fim: FATIA_PS5, textoBranco: true },
  { id: 'saideira', nome: 'A Saideira', emoji: '🍺', cor: '#f59e0b', inicio: FATIA_PS5, fim: FATIA_PS5 + FATIA_NORMAL, textoBranco: false }, // 1 Cerveja
  { id: 'nada1', nome: 'Não foi...', emoji: '😢', cor: '#ef4444', inicio: FATIA_PS5 + FATIA_NORMAL, fim: FATIA_PS5 + (FATIA_NORMAL * 2), textoBranco: true },
  { id: 'sobremesa', nome: 'Sobremesa', emoji: '🍮', cor: '#10b981', inicio: FATIA_PS5 + (FATIA_NORMAL * 2), fim: FATIA_PS5 + (FATIA_NORMAL * 3), textoBranco: true }, // Pudim ou Brownie
  { id: 'expulsadeira', nome: 'Expulsadeira', emoji: '🍻', cor: '#8b5cf6', inicio: FATIA_PS5 + (FATIA_NORMAL * 3), fim: FATIA_PS5 + (FATIA_NORMAL * 4), textoBranco: true }, // 2 Cervejas
  { id: 'picole', nome: 'Picolé Gold', emoji: '🍦', cor: '#ec4899', inicio: FATIA_PS5 + (FATIA_NORMAL * 4), fim: FATIA_PS5 + (FATIA_NORMAL * 5), textoBranco: true },
  { id: 'nada2', nome: 'Não foi...', emoji: '😢', cor: '#ef4444', inicio: FATIA_PS5 + (FATIA_NORMAL * 5), fim: FATIA_PS5 + (FATIA_NORMAL * 6), textoBranco: true },
  { id: 'pontos', nome: '50 Pontos', emoji: '🌟', cor: '#fbbf24', inicio: FATIA_PS5 + (FATIA_NORMAL * 6), fim: 360, textoBranco: false },
];

export default function RoletaPage() {
  const [fase, setFase] = useState<'garcom' | 'cliente' | 'roleta'>('garcom');
  const [senhaGarcom, setSenhaGarcom] = useState('');
  const [telefone, setTelefone] = useState('');
  
  const [girando, setGirando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const rodaRef = useRef<HTMLDivElement>(null);

  const backgroundGradient = useMemo(() => {
    return `conic-gradient(${ITENS_RODA.map(item => `${item.cor} ${item.inicio}deg ${item.fim}deg`).join(', ')})`;
  }, []);

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let numbers = e.target.value.replace(/\D/g, '');
    if (numbers.length > 11) numbers = numbers.slice(0, 11);
    let formatted = numbers;
    if (numbers.length > 0) formatted = `(${numbers.slice(0, 2)}`;
    if (numbers.length > 2) formatted += `) ${numbers.slice(2, 7)}`;
    if (numbers.length > 7) formatted += `-${numbers.slice(7)}`;
    setTelefone(formatted);
  };

  function validarSenha() {
    if (['1111', '2222', '3333'].includes(senhaGarcom)) setFase('cliente');
    else alert('Senha incorreta!');
  }

  function validarTelefone() {
    if (telefone.replace(/\D/g, '').length === 11) setFase('roleta');
    else alert('Preencha o telefone completo!');
  }

  async function girarRoleta() {
    if (girando) return;
    setGirando(true);
    setResultado(null);

    try {
      const res = await fetch('/api/roleta/girar', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            cliente_id: telefone.replace(/\D/g, ''), 
            senha_garcom: senhaGarcom 
        })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // --- CORREÇÃO DO MAPEAMENTO (AQUI ESTAVA O ERRO) ---
      // O backend manda o nome do prêmio. Precisamos decidir qual FATIA VISUAL girar.
      const nomePremio = data.premio.nome.toLowerCase();
      let idVisual = '';

      if (nomePremio.includes('pontos')) idVisual = 'pontos';
      else if (nomePremio.includes('saideira')) idVisual = 'saideira';
      else if (nomePremio.includes('expulsadeira')) idVisual = 'expulsadeira';
      else if (nomePremio.includes('sobremesa') || nomePremio.includes('pudim') || nomePremio.includes('brownie')) idVisual = 'sobremesa';
      else if (nomePremio.includes('picolé') || nomePremio.includes('gold')) idVisual = 'picole';
      else if (nomePremio.includes('não') || nomePremio.includes('nao')) idVisual = 'nada1'; // ou nada2, tanto faz
      else idVisual = 'nada1'; // Fallback se der ruim

      const itemVisual = ITENS_RODA.find(i => i.id === idVisual);

      if (!itemVisual) throw new Error('Erro visual de mapeamento');

      // --- FIM DA CORREÇÃO ---

      const centroFatia = itemVisual.inicio + ((itemVisual.fim - itemVisual.inicio) / 2);
      const voltas = 5 * 360; 
      const ruido = (Math.random() * (FATIA_NORMAL * 0.4)) - (FATIA_NORMAL * 0.2); 
      const rotacaoFinal = voltas + (360 - centroFatia) + ruido;

      if (rodaRef.current) {
        rodaRef.current.style.transition = 'transform 5s cubic-bezier(0.15, 0, 0.15, 1)'; 
        rodaRef.current.style.transform = `rotate(${rotacaoFinal}deg)`;
      }

      setTimeout(() => {
        setResultado(data.premio);
        setGirando(false);
        if (data.premio.tipo !== 'nada') {
           confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }
      }, 5000);

    } catch (error: any) {
      console.error(error);
      alert('Erro: ' + error.message);
      setGirando(false);
    }
  }

  // Descrição detalhada do prêmio para o modal
  const getDescricaoPremio = (premio: any) => {
    if (!premio) return '';
    const nome = premio.nome.toLowerCase();
    if (nome.includes('expulsadeira')) return 'Ganhou: 2 Cervejas! 🍻';
    if (nome.includes('saideira')) return 'Ganhou: 1 Cerveja! 🍺';
    if (nome.includes('sobremesa')) return 'Escolha: Pudim ou Brownie! 🍮';
    if (nome.includes('pontos')) return '50 Pontos creditados!';
    return `Você ganhou: ${premio.nome}`;
  };

  // --- RENDERS ---

  if (fase === 'garcom') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="bg-gray-900 border border-[#c5a059] p-8 rounded-2xl w-full max-w-sm shadow-2xl">
            <h1 className="text-2xl text-[#c5a059] font-black mb-4 uppercase tracking-wider">Área do Garçom</h1>
            <p className="text-gray-400 mb-6 text-sm">Senha da mesa:</p>
            <input 
                type="tel" maxLength={4}
                value={senhaGarcom} onChange={(e) => setSenhaGarcom(e.target.value)}
                className="bg-black text-white text-3xl text-center p-4 rounded-xl border border-gray-700 focus:border-[#c5a059] w-full tracking-[10px] mb-6 outline-none"
            />
            <button onClick={validarSenha} className="w-full bg-[#c5a059] text-black font-bold py-4 rounded-xl">LIBERAR</button>
        </div>
      </div>
    );
  }

  if (fase === 'cliente') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-sm w-full">
            <h1 className="text-3xl text-white font-bold mb-2">Quase lá! 🎲</h1>
            <p className="text-gray-400 mb-8">Seu WhatsApp para o prêmio:</p>
            <input 
                type="tel" placeholder="(11) 99999-9999" value={telefone} onChange={handleTelefoneChange} maxLength={15}
                className="bg-white text-black text-2xl text-center p-4 rounded-xl w-full mb-6 font-bold focus:border-[#c5a059] border-4 border-transparent outline-none"
            />
            <button onClick={validarTelefone} className="w-full bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg">IR PARA ROLETA</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center p-4 overflow-hidden font-sans">
      <h1 className="text-3xl md:text-5xl font-black text-[#c5a059] mb-8 text-center uppercase tracking-wider drop-shadow-lg">🎰 Roleta do Rei 🎰</h1>
      
      <div className="relative w-[320px] h-[320px] md:w-[450px] md:h-[450px] mb-12">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 w-12 h-16 flex justify-center">
             <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[40px] border-t-white drop-shadow-md"></div>
        </div>
        <div className="absolute inset-[-10px] rounded-full border-4 border-[#c5a059] opacity-30 animate-pulse"></div>
        
        <div ref={rodaRef} className="w-full h-full rounded-full relative shadow-2xl border-[8px] border-[#2a2a2a] overflow-hidden" style={{ background: backgroundGradient }}>
          {ITENS_RODA.map((item) => {
            const anguloMeio = item.inicio + ((item.fim - item.inicio) / 2);
            return (
              <div key={item.id} className="absolute top-0 left-1/2 h-1/2 w-[1px] origin-bottom flex justify-center pt-4" style={{ transform: `rotate(${anguloMeio}deg)` }}>
                <div className={`whitespace-nowrap font-bold uppercase flex flex-col items-center -translate-y-1 ${item.textoBranco ? 'text-white' : 'text-black'}`}>
                  <span className="text-2xl md:text-3xl filter drop-shadow-sm">{item.emoji}</span>
                  <span className="leading-none mt-1 text-center font-bold drop-shadow-md" style={{ fontSize: item.id === 'ps5' ? '8px' : '11px', transform: item.id === 'ps5' ? 'scale(0.9)' : 'none', maxWidth: '80px' }}>{item.nome}</span>
                </div>
              </div>
            );
          })}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-[#c5a059] rounded-full border-4 border-[#1a1a1a] flex items-center justify-center text-2xl">👑</div>
        </div>
      </div>

      {!resultado && (
        <button onClick={girarRoleta} disabled={girando} className="bg-gradient-to-b from-[#c5a059] to-[#a08040] text-black font-black text-2xl py-4 px-12 rounded-full shadow-[0_4px_0_#6b5326] active:translate-y-1 active:shadow-none disabled:opacity-50">
            {girando ? 'TORCENDO...' : 'GIRAR AGORA!'}
        </button>
      )}

      {resultado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
           <div className="bg-[#1a1a1a] border border-[#c5a059] p-8 rounded-2xl w-full max-w-sm text-center">
                <div className="text-7xl animate-bounce mb-4">{resultado.emoji}</div>
                <h2 className="text-3xl font-black text-white uppercase">{resultado.tipo === 'nada' ? 'Que pena!' : 'PARABÉNS!'}</h2>
                
                <p className="text-xl text-[#c5a059] font-bold mt-4 leading-tight">
                    {getDescricaoPremio(resultado)}
                </p>
                
                {resultado.tipo === 'pontos' && (
                    <div className="mt-4 bg-green-900/30 p-3 rounded text-green-400 text-xs">
                        Pontos vinculados ao telefone: <br/><strong>{telefone}</strong>
                    </div>
                )}
                
                <button onClick={() => window.location.reload()} className="mt-8 w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200">
                    Novo Jogo
                </button>
           </div>
        </div>
      )}
    </div>
  );
}