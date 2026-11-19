import { createZodDto } from 'nestjs-zod';
import { adminDiaryUpdateSchema } from '@fitpal/shared';

export class AdminDiaryUpdateDto extends createZodDto(adminDiaryUpdateSchema) {}
