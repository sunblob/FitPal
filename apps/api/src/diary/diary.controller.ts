import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, TelegramAuthGuard } from '../auth/telegram-auth.guard.js';
import { UuidParamDto } from '../common/dto/uuid-param.dto.js';
import type { User } from '../db/schema.js';
import { CloseDayDto } from './dto/close-day.dto.js';
import { CopyDiaryDto } from './dto/copy-diary.dto.js';
import { CreateDiaryEntryDto } from './dto/create-diary-entry.dto.js';
import { DiaryDayQueryDto } from './dto/diary-day-query.dto.js';
import { UpdateDiaryEntryDto } from './dto/update-diary-entry.dto.js';
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
    return this.diary.add(user.id, body, user.language);
  }

  @Get('week')
  week(@CurrentUser() user: User, @Query() query: DiaryDayQueryDto) {
    return this.diary.week(user, query.date);
  }

  @Get('streak')
  streak(@CurrentUser() user: User) {
    return this.diary.streak(user);
  }

  @Put('closed')
  @HttpCode(204)
  setClosed(@CurrentUser() user: User, @Body() body: CloseDayDto) {
    return this.diary.setClosed(user.id, body);
  }

  @Post('copy')
  copy(@CurrentUser() user: User, @Body() body: CopyDiaryDto) {
    return this.diary.copy(user, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param() { id }: UuidParamDto,
    @Body() body: UpdateDiaryEntryDto,
  ) {
    return this.diary.update(user.id, id, body, user.language);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: User, @Param() { id }: UuidParamDto) {
    return this.diary.remove(user.id, id);
  }
}
