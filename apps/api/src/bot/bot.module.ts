import { Module } from '@nestjs/common';
import { DiaryModule } from '../diary/diary.module.js';
import { RecognitionModule } from '../recognition/recognition.module.js';
import { UsersModule } from '../users/users.module.js';
import { BotController } from './bot.controller.js';
import { BotService } from './bot.service.js';
import { RemindersService } from './reminders.service.js';

@Module({
  imports: [UsersModule, DiaryModule, RecognitionModule],
  controllers: [BotController],
  providers: [BotService, RemindersService],
})
export class BotModule {}
