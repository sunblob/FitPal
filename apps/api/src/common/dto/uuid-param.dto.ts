import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const uuidParamSchema = z.object({ id: z.uuid() });

export class UuidParamDto extends createZodDto(uuidParamSchema) {}
