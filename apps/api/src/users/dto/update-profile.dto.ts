import { createZodDto } from 'nestjs-zod';
import { profileSchema } from '@fitpal/shared';

export class UpdateProfileDto extends createZodDto(profileSchema) {}
