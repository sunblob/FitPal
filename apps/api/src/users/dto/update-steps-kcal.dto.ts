import { createZodDto } from 'nestjs-zod';
import { updateStepsKcalSchema } from '@fitpal/shared';

export class UpdateStepsKcalDto extends createZodDto(updateStepsKcalSchema) {}
