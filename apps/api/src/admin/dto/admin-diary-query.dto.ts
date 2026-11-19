import { createZodDto } from 'nestjs-zod';
import { adminDiaryQuerySchema } from '@fitpal/shared';

export class AdminDiaryQueryDto extends createZodDto(adminDiaryQuerySchema) {}
