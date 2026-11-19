import { createZodDto } from 'nestjs-zod';
import { barcodeParamSchema } from '@fitpal/shared';

export class BarcodeParamDto extends createZodDto(barcodeParamSchema) {}
