import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barcodeVariants } from './barcode-variants.js';

test('barcodeVariants matches UPC-A and the same code read as EAN-13', () => {
  assert.ok(barcodeVariants('036000291452').includes('0036000291452'));
  assert.ok(barcodeVariants('0036000291452').includes('036000291452'));
});

test('barcodeVariants keeps a plain EAN-13 as is', () => {
  assert.deepEqual(barcodeVariants('8586000001234'), ['8586000001234', '08586000001234']);
});
