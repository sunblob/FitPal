import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const workoutLogQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export class WorkoutLogQueryDto extends createZodDto(workoutLogQuerySchema) {}
