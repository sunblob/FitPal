import { createZodDto } from 'nestjs-zod';
import { adminExerciseUpdateSchema } from '@fitpal/shared';

export class AdminExerciseUpdateDto extends createZodDto(adminExerciseUpdateSchema) {}
