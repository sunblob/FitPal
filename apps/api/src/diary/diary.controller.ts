import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, TelegramAuthGuard } from '../auth/telegram-auth.guard.js';
import { UuidParamDto } from '../common/dto/uuid-param.dto.js';
import type { User } from '../db/schema.js';
import { CreateDiaryEntryDto } from './dto/create-diary-entry.dto.js';
import { DiaryDayQueryDto } from './dto/diary-day-query.dto.js';
import { DiaryService } from './diary.service.js';

@Controller('diary')
@UseGuards(TelegramAuthGuard)
export class DiaryController {
  constructor(private readonly diary: DiaryService) {}

  @Get()
  day(@CurrentUser() user: User, @Query() query: DiaryDayQueryDto) {
    return this.diary.day(user, query.date);
  }

  @Post()
  add(@CurrentUser() user: User, @Body() body: CreateDiaryEntryDto) {
    return this.diary.add(user.id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: User, @Param() { id }: UuidParamDto) {
    return this.diary.remove(user.id, id);
  }
}
