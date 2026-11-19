import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const unlogExerciseSchema = z.object({
  exerciseId: z.string().min(1).max(200),
  date: z.iso.date().optional(),
});

export class UnlogExerciseDto extends createZodDto(unlogExerciseSchema) {}
