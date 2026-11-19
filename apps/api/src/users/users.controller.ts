import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { profileSchema, type Profile } from '@fitpal/shared';
import { CurrentUser, TelegramAuthGuard } from '../auth/telegram-auth.guard.js';
import { ZodPipe } from '../common/zod.pipe.js';
import type { User } from '../db/schema.js';
import { UsersService } from './users.service.js';

@Controller('me')
@UseGuards(TelegramAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser() user: User) {
    return user;
  }

  @Put('profile')
  updateProfile(@CurrentUser() user: User, @Body(new ZodPipe(profileSchema)) body: Profile) {
    return this.users.updateProfile(user.id, body);
  }
}
