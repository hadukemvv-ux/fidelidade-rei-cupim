export type LeituraComanda = {
  mesa?: string;
  data_operacional?: string;
  horario_abertura?: string;
  id_pedido_impresso?: string;
  valor_confirmado?: string;
  texto_detectado: boolean;
};

const MESES: Record<string, string> = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' };
const valorLinha = (line: string) => line.match(/\d{1,3}(?:[.]\d{3})*[,\.]\d{2}/)?.[0] || '';

/** Extrai sugestões do texto OCR; nunca trata a leitura como confirmação. */
export function extrairDadosDaComanda(texto: string, anoAtual = new Date().getFullYear()): LeituraComanda {
  const normalizado = texto.replace(/\r/g, '');
  const mesa = normalizado.match(/mesa\s*[:.]?\s*(\d{1,6})/i)?.[1];
  const id = normalizado.match(/id\s*(?:do)?\s*pedido\s*[:.]?\s*(\d{4,30})/i)?.[1];
  const carimbo = normalizado.match(/(\d{1,2})\s*\/\s*(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s*[-–]\s*(\d{1,2}:\d{2})/i);
  const linhas = normalizado.split('\n').map((line) => line.trim()).filter(Boolean);
  const indiceTotal = linhas.findIndex((line) => /total\s*\(?\s*=?\s*\)?/i.test(line));
  let valor = indiceTotal >= 0 ? valorLinha(linhas[indiceTotal]) : '';
  if (!valor && indiceTotal >= 0) {
    for (const line of linhas.slice(indiceTotal + 1, indiceTotal + 4)) { valor = valorLinha(line); if (valor) break; }
  }
  const mes = carimbo ? MESES[carimbo[2].toLowerCase()] : undefined;
  return {
    mesa,
    id_pedido_impresso: id,
    data_operacional: carimbo && mes ? `${anoAtual}-${mes}-${carimbo[1].padStart(2, '0')}` : undefined,
    horario_abertura: carimbo?.[3],
    valor_confirmado: valor.replace('.', ',') || undefined,
    texto_detectado: normalizado.replace(/\s/g, '').length > 10,
  };
}

/** OCR local no navegador. A imagem não é enviada para o servidor nesta etapa. */
export async function lerFotosDaComanda(cabecalho: File, total: File, onProgress: (texto: string) => void): Promise<LeituraComanda> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('por', 1, { logger: (message: { status: string; progress: number }) => {
    if (message.status === 'recognizing text') onProgress(`Lendo texto das fotos… ${Math.round(message.progress * 100)}%`);
  } });
  try {
    const primeiro = await worker.recognize(cabecalho);
    const segundo = await worker.recognize(total);
    return extrairDadosDaComanda(`${primeiro.data.text}\n${segundo.data.text}`);
  } finally {
    await worker.terminate();
  }
}
