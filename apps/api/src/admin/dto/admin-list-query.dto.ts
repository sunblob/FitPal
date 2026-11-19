import { createZodDto } from 'nestjs-zod';
import { adminListQuerySchema } from '@fitpal/shared';

export class AdminListQueryDto extends createZodDto(adminListQuerySchema) {}
