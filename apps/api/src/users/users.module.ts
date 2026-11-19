import { Module } from '@nestjs/common';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService, TelegramAuthGuard],
  exports: [UsersService, TelegramAuthGuard],
})
export class UsersModule {}
