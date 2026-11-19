import { createZodDto } from 'nestjs-zod';
import { logWeightSchema } from '@fitpal/shared';

export class LogWeightDto extends createZodDto(logWeightSchema) {}
