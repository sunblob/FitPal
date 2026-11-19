import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const weightHistoryQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export class WeightHistoryQueryDto extends createZodDto(weightHistoryQuerySchema) {}
