import { createZodDto } from 'nestjs-zod';
import { adminFoodUpdateSchema } from '@fitpal/shared';

export class AdminFoodUpdateDto extends createZodDto(adminFoodUpdateSchema) {}
