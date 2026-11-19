import { createZodDto } from 'nestjs-zod';
import { logStepsSchema } from '@fitpal/shared';

export class LogStepsDto extends createZodDto(logStepsSchema) {}
