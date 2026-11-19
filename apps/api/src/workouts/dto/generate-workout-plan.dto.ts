import { createZodDto } from 'nestjs-zod';
import { generateWorkoutPlanSchema } from '@fitpal/shared';

export class GenerateWorkoutPlanDto extends createZodDto(generateWorkoutPlanSchema) {}
