import { createZodDto } from 'nestjs-zod';
import { waterDayQuerySchema } from '@fitpal/shared';

export class WaterDayQueryDto extends createZodDto(waterDayQuerySchema) {}
