import { createZodDto } from 'nestjs-zod';
import { adminLoginSchema } from '@fitpal/shared';

export class AdminLoginDto extends createZodDto(adminLoginSchema) {}
