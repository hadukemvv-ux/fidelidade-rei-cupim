export type LeituraComanda = {
  mesa?: string;
  data_operacional?: string;
  horario_abertura?: string;
  id_pedido_impresso?: string;
  valor_confirmado?: string;
  texto_detectado: boolean;
};

export type ValidacaoLeituraComanda = {
  pronta: boolean;
  camposAusentes: string[];
};

const MESES: Record<string, string> = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' };
const valorLinha = (line: string) => line.match(/\d{1,3}(?:[.]\d{3})*[,\.]\d{2}/)?.[0] || '';
const linhaDoTotalFinal = (line: string) => /^total(?!\s+(?:de\s+)?itens?\b)\s*\(\s*=?\s*\)/i.test(line.trim());
const MAXIMO_BYTES_POR_FOTO = 1_400_000;

type FonteImagem = {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
};

async function criarBitmap(file: File): Promise<FonteImagem> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, dispose: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const elemento = new Image();
      elemento.onload = () => resolve(elemento);
      elemento.onerror = () => reject(new Error('Não foi possível abrir a foto.'));
      elemento.src = url;
    });
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, dispose: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function criarCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function dimensoesLimitadas(width: number, height: number, maximoLado: number) {
  const escala = Math.min(1, maximoLado / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * escala)), height: Math.max(1, Math.round(height * escala)) };
}

async function blobDoCanvas(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * Cria uma cópia temporária com contraste reforçado para o OCR local. Ela não
 * é enviada ao servidor: a evidência salva continua sendo uma cópia privada
 * da fotografia em cor.
 */
async function prepararImagemParaOcr(file: File, modo: 'contraste' | 'sombra' = 'contraste'): Promise<Blob | File> {
  try {
    const bitmap = await criarBitmap(file);
    const dimensoes = dimensoesLimitadas(bitmap.width, bitmap.height, 2200);
    const canvas = criarCanvas(dimensoes.width, dimensoes.height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) { bitmap.dispose(); return file; }
    context.drawImage(bitmap.source, 0, 0, dimensoes.width, dimensoes.height);
    bitmap.dispose();
    const imagem = context.getImageData(0, 0, dimensoes.width, dimensoes.height);
    const { width, height, data } = imagem;
    if (modo === 'contraste') {
      for (let index = 0; index < data.length; index += 4) {
        const luminosidade = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
        const ajustada = Math.max(0, Math.min(255, (luminosidade - 128) * 1.7 + 128));
        data[index] = ajustada;
        data[index + 1] = ajustada;
        data[index + 2] = ajustada;
      }
    } else {
      const luminosidades = new Uint8Array(width * height);
      const tamanhoBloco = 64;
      const colunas = Math.ceil(width / tamanhoBloco);
      const somas = new Float64Array(colunas * Math.ceil(height / tamanhoBloco));
      const contagens = new Uint32Array(somas.length);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pixel = y * width + x;
          const index = pixel * 4;
          const luminosidade = Math.round(data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114);
          luminosidades[pixel] = luminosidade;
          const bloco = Math.floor(y / tamanhoBloco) * colunas + Math.floor(x / tamanhoBloco);
          somas[bloco] += luminosidade;
          contagens[bloco]++;
        }
      }
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pixel = y * width + x;
          const index = pixel * 4;
          const bloco = Math.floor(y / tamanhoBloco) * colunas + Math.floor(x / tamanhoBloco);
          const ajustada = luminosidades[pixel] < somas[bloco] / contagens[bloco] - 25 ? 0 : 255;
          data[index] = ajustada;
          data[index + 1] = ajustada;
          data[index + 2] = ajustada;
        }
      }
    }
    context.putImageData(imagem, 0, 0);
    return await blobDoCanvas(canvas, 0.92) || file;
  } catch {
    return file;
  }
}

/** Mantém cada cópia privada enviada abaixo do limite operacional da Vercel. */
export async function prepararFotoParaEnvio(file: File): Promise<File> {
  const bitmap = await criarBitmap(file);
  try {
    for (const [maximoLado, quality] of [[2048, 0.82], [1600, 0.72], [1280, 0.64]] as const) {
      const dimensoes = dimensoesLimitadas(bitmap.width, bitmap.height, maximoLado);
      const canvas = criarCanvas(dimensoes.width, dimensoes.height);
      const context = canvas.getContext('2d');
      if (!context) break;
      context.drawImage(bitmap.source, 0, 0, dimensoes.width, dimensoes.height);
      const blob = await blobDoCanvas(canvas, quality);
      if (blob && blob.size <= MAXIMO_BYTES_POR_FOTO) {
        return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'comanda'}.jpg`, { type: 'image/jpeg' });
      }
    }
  } finally {
    bitmap.dispose();
  }
  throw new Error('Não foi possível reduzir a foto para envio. Tire uma foto mais próxima do cupom e tente novamente.');
}

/** Extrai sugestões do texto OCR; nunca trata a leitura como confirmação. */
export function extrairDadosDaComanda(texto: string, anoAtual = new Date().getFullYear()): LeituraComanda {
  const normalizado = texto.replace(/\r/g, '');
  const mesa = normalizado.match(/mesa\s*[:.]?\s*(\d{1,6})/i)?.[1];
  const id = normalizado.match(/id\s*(?:do)?\s*pedido\s*[:.]?\s*(\d{4,30})/i)?.[1];
  const carimbo = normalizado.match(/(\d{1,2})\s*\/\s*(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s*[-–]\s*(\d{1,2}:\d{2})/i);
  const linhas = normalizado.split('\n').map((line) => line.trim()).filter(Boolean);
  // A comanda Saipos tem o subtotal "Total itens (=)" e, depois de taxas e
  // descontos, o valor efetivamente cobrado em "TOTAL (=)". Só este último
  // pode definir a faixa do QR.
  const indiceTotal = linhas.findIndex(linhaDoTotalFinal);
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

/**
 * No piloto não pedimos que o garçom redigite mesa, data, horário ou pedido.
 * Se algum deles não vier da comanda, a evidência deve ser refeita para que o
 * QR não seja emitido com uma referência fraca.
 */
export function validarLeituraParaPiloto(leitura: LeituraComanda): ValidacaoLeituraComanda {
  const camposAusentes = [
    !leitura.mesa && 'mesa',
    !leitura.data_operacional && 'data de abertura',
    !leitura.horario_abertura && 'horário de abertura',
    !leitura.id_pedido_impresso && 'ID do pedido',
    !leitura.valor_confirmado && 'valor total',
  ].filter((campo): campo is string => Boolean(campo));
  return { pronta: camposAusentes.length === 0, camposAusentes };
}

/** OCR local no navegador. A imagem não é enviada para o servidor nesta etapa. */
export async function lerFotosDaComanda(cabecalho: File, total: File, onProgress: (texto: string) => void): Promise<LeituraComanda> {
  const { createWorker, PSM } = await import('tesseract.js');
  const worker = await createWorker('por', 1, { logger: (message: { status: string; progress: number }) => {
    if (message.status === 'recognizing text') onProgress(`Lendo texto das fotos… ${Math.round(message.progress * 100)}%`);
  } });
  try {
    const [cabecalhoOcr, totalOcr] = await Promise.all([prepararImagemParaOcr(cabecalho), prepararImagemParaOcr(total)]);
    const primeiro = await worker.recognize(cabecalhoOcr);
    const segundo = await worker.recognize(totalOcr);
    const leituraInicial = extrairDadosDaComanda(`${primeiro.data.text}\n${segundo.data.text}`);
    if (validarLeituraParaPiloto(leituraInicial).pronta) return leituraInicial;

    // A sombra pode tornar ilegível apenas uma região. Reprocessamos somente
    // a foto com campos ausentes, sem enviar texto ou imagem extra ao servidor.
    onProgress('Ajustando áreas com sombra para uma segunda leitura…');
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    const precisaCabecalho = !leituraInicial.mesa || !leituraInicial.data_operacional || !leituraInicial.horario_abertura || !leituraInicial.id_pedido_impresso;
    const precisaTotal = !leituraInicial.valor_confirmado;
    const novoCabecalho = precisaCabecalho ? await worker.recognize(await prepararImagemParaOcr(cabecalho, 'sombra')) : primeiro;
    const novoTotal = precisaTotal ? await worker.recognize(await prepararImagemParaOcr(total, 'sombra')) : segundo;
    const leituraAlternativa = extrairDadosDaComanda(`${novoCabecalho.data.text}\n${novoTotal.data.text}`);
    if (validarLeituraParaPiloto(leituraAlternativa).pronta) return leituraAlternativa;
    return {
      mesa: leituraInicial.mesa || leituraAlternativa.mesa,
      data_operacional: leituraInicial.data_operacional || leituraAlternativa.data_operacional,
      horario_abertura: leituraInicial.horario_abertura || leituraAlternativa.horario_abertura,
      id_pedido_impresso: leituraInicial.id_pedido_impresso || leituraAlternativa.id_pedido_impresso,
      valor_confirmado: leituraInicial.valor_confirmado || leituraAlternativa.valor_confirmado,
      texto_detectado: leituraInicial.texto_detectado || leituraAlternativa.texto_detectado,
    };
  } finally {
    await worker.terminate();
  }
}
