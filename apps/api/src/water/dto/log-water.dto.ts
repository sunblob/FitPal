import { createZodDto } from 'nestjs-zod';
import { logWaterSchema } from '@fitpal/shared';

export class LogWaterDto extends createZodDto(logWaterSchema) {}
