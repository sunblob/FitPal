import { createZodDto } from 'nestjs-zod';
import { updateLanguageSchema } from '@fitpal/shared';

export class UpdateLanguageDto extends createZodDto(updateLanguageSchema) {}
