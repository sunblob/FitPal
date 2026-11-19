import { createZodDto } from 'nestjs-zod';
import { foodSearchQuerySchema } from '@fitpal/shared';

export class FoodSearchQueryDto extends createZodDto(foodSearchQuerySchema) {}
