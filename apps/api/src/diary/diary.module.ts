import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { DiaryController } from './diary.controller.js';
import { DiaryService } from './diary.service.js';

@Module({
  imports: [UsersModule],
  controllers: [DiaryController],
  providers: [DiaryService],
})
export class DiaryModule {}
