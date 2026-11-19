import { createZodDto } from 'nestjs-zod';
import { adminUserUpdateSchema } from '@fitpal/shared';

export class AdminUserUpdateDto extends createZodDto(adminUserUpdateSchema) {}
