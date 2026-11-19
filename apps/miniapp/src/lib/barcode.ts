import { BarcodeDetector, prepareZXingModule, type BarcodeFormat } from 'barcode-detector/ponyfill';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

// Отдаём wasm со своего сервера, а не с CDN по умолчанию
prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) =>
      path.endsWith('.wasm') ? wasmUrl : prefix + path,
  },
});

const FORMATS: BarcodeFormat[] = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
let detector: BarcodeDetector | undefined;

function getDetector() {
  detector ??= new BarcodeDetector({ formats: FORMATS });
  return detector;
}

/** Ищет штрихкод на кадре видео или картинке. */
export async function detectBarcode(source: ImageBitmapSource): Promise<string | null> {
  const [hit] = await getDetector().detect(source);
  return hit?.rawValue ?? null;
}

export const isValidBarcode = (code: string) => /^\d{8,14}$/.test(code);
