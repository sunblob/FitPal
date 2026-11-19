import { createZodDto } from 'nestjs-zod';
import { createFoodSchema } from '@fitpal/shared';

export class CreateFoodDto extends createZodDto(createFoodSchema) {}
