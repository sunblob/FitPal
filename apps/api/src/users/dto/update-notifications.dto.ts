import { createZodDto } from 'nestjs-zod';
import { updateNotificationsSchema } from '@fitpal/shared';

export class UpdateNotificationsDto extends createZodDto(updateNotificationsSchema) {}
