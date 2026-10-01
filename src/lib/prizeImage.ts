import sharp from 'sharp';

export const PRIZE_IMAGE_BUCKET = 'premios';
export const MAX_PRIZE_IMAGE_UPLOAD = 2 * 1024 * 1024;
export const MAX_PRIZE_IMAGE_STORED = 512 * 1024;
export const PRIZE_IMAGE_ORIGIN = 'https://asjoubgoccbvftyggunz.supabase.co';
const formats: Record<string, string> = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };

export class PrizeImageInputError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

/** Decode/re-encode, rather than trusting the extension or copying EXIF/GPS. */
export async function preparePrizeImage(bytes: Uint8Array, mime: string) {
  if (!bytes.length || bytes.length > MAX_PRIZE_IMAGE_UPLOAD) throw new PrizeImageInputError('Envie uma foto de até 2 MB.', 413);
  const format = formats[mime];
  if (!format) throw new PrizeImageInputError('Use uma foto JPG, PNG ou WebP.');
  const input = Buffer.from(bytes);
  const magic = format === 'jpeg' ? input.subarray(0, 3).equals(Buffer.from([255, 216, 255])) :
    format === 'png' ? input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) :
      input.toString('ascii', 0, 4) === 'RIFF' && input.toString('ascii', 8, 12) === 'WEBP';
  if (!magic) throw new PrizeImageInputError('O conteúdo não corresponde ao formato da foto.');
  try {
    const image = sharp(input, { limitInputPixels: 16_000_000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (metadata.format !== format || !metadata.width || !metadata.height || (metadata.pages || 1) !== 1) throw new Error('Invalid image');
    const output = await image.rotate().resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 }).timeout({ seconds: 5 }).toBuffer();
    if (output.length > MAX_PRIZE_IMAGE_STORED) throw new PrizeImageInputError('Foto muito complexa. Reduza o tamanho e tente novamente.', 413);
    return output;
  } catch (error) {
    if (error instanceof PrizeImageInputError) throw error;
    throw new PrizeImageInputError('Não foi possível ler a foto. Use um JPG, PNG ou WebP válido, sem animação e com até 16 megapixels.');
  }
}

export function prizeImagePath(prizeId: number, uploadId: string) {
  if (!Number.isSafeInteger(prizeId) || prizeId <= 0 || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(uploadId)) throw new Error('Invalid image destination');
  return `roleta/${prizeId}/${uploadId}.webp`;
}

export function prizeImageUrl(path: string) {
  if (!/^roleta\/[1-9]\d*\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$/.test(path)) throw new Error('Invalid image destination');
  return `${PRIZE_IMAGE_ORIGIN}/storage/v1/object/public/${PRIZE_IMAGE_BUCKET}/${path}`;
}
