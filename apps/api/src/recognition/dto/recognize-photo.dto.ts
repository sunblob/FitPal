import { createZodDto } from 'nestjs-zod';
import { recognizePhotoSchema } from '@fitpal/shared';

export class RecognizePhotoDto extends createZodDto(recognizePhotoSchema) {}
