import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const stepsHistoryQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export class StepsHistoryQueryDto extends createZodDto(stepsHistoryQuerySchema) {}
