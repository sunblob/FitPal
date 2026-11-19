/**
 * Один и тот же товар сканер может прочитать как UPC-A (12 цифр) или как EAN-13 с ведущим
 * нулём, а GTIN-14 бывает дополнен нулями. Ищем по всем вариантам, чтобы сохранённый
 * продукт нашёлся при любом прочтении.
 */
export function barcodeVariants(code: string): string[] {
  const core = code.replace(/^0+/, '');
  const variants = new Set([code]);
  for (const len of [8, 12, 13, 14]) {
    if (core.length <= len) variants.add(core.padStart(len, '0'));
  }
  return [...variants];
}
