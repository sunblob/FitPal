import { createZodDto } from 'nestjs-zod';
import { createDiaryEntrySchema } from '@fitpal/shared';

export class CreateDiaryEntryDto extends createZodDto(createDiaryEntrySchema) {}
