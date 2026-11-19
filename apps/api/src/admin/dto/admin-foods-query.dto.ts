import { createZodDto } from 'nestjs-zod';
import { adminFoodsQuerySchema } from '@fitpal/shared';

export class AdminFoodsQueryDto extends createZodDto(adminFoodsQuerySchema) {}
