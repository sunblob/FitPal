import { createZodDto } from 'nestjs-zod';
import { logExerciseSchema } from '@fitpal/shared';

export class LogExerciseDto extends createZodDto(logExerciseSchema) {}
