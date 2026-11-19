import { createZodDto } from 'nestjs-zod';
import { closeDaySchema } from '@fitpal/shared';

export class CloseDayDto extends createZodDto(closeDaySchema) {}
