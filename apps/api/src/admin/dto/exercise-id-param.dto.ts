import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class ExerciseIdParamDto extends createZodDto(
  z.object({ id: z.string().min(1).max(200) }),
) {}
