import { createZodDto } from 'nestjs-zod';
import { updateRemindersSchema } from '@fitpal/shared';

export class UpdateRemindersDto extends createZodDto(updateRemindersSchema) {}
