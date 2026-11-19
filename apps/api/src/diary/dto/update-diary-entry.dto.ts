import { createZodDto } from 'nestjs-zod';
import { updateDiaryEntrySchema } from '@fitpal/shared';

export class UpdateDiaryEntryDto extends createZodDto(updateDiaryEntrySchema) {}
