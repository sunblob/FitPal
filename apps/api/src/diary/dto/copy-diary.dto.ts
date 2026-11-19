import { createZodDto } from 'nestjs-zod';
import { copyDiarySchema } from '@fitpal/shared';

export class CopyDiaryDto extends createZodDto(copyDiarySchema) {}
