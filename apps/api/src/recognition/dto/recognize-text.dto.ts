import { createZodDto } from 'nestjs-zod';
import { recognizeTextSchema } from '@fitpal/shared';

export class RecognizeTextDto extends createZodDto(recognizeTextSchema) {}
