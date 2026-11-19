import { createZodDto } from 'nestjs-zod';
import { dayQuerySchema } from '@fitpal/shared';

export class DiaryDayQueryDto extends createZodDto(dayQuerySchema) {}
