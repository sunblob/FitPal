import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { BotController } from './bot.controller.js';
import { BotService } from './bot.service.js';

@Module({
  imports: [UsersModule],
  controllers: [BotController],
  providers: [BotService],
})
export class BotModule {}
