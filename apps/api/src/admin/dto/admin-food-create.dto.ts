import { createZodDto } from 'nestjs-zod';
import { adminFoodCreateSchema } from '@fitpal/shared';

export class AdminFoodCreateDto extends createZodDto(adminFoodCreateSchema) {}
