import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentUser, TelegramAuthGuard } from '../auth/telegram-auth.guard.js';
import type { User } from '../db/schema.js';
import { UpdateLanguageDto } from './dto/update-language.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdateNotificationsDto } from './dto/update-notifications.dto.js';
import { UpdateStepsKcalDto } from './dto/update-steps-kcal.dto.js';
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
  updateProfile(@CurrentUser() user: User, @Body() body: UpdateProfileDto) {
    return this.users.updateProfile(user, body);
  }

  @Put('notifications')
  updateNotifications(@CurrentUser() user: User, @Body() body: UpdateNotificationsDto) {
    return this.users.setNotifications(user.id, body);
  }

  @Put('steps-kcal')
  updateStepsKcal(@CurrentUser() user: User, @Body() body: UpdateStepsKcalDto) {
    return this.users.setStepsKcal(user.id, body.addStepsKcal);
  }

  @Put('language')
  updateLanguage(@CurrentUser() user: User, @Body() body: UpdateLanguageDto) {
    return this.users.setLanguage(user.id, body.language);
  }
}
