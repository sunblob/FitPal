import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { todayIn } from '@fitpal/shared';
import { CurrentUser, TelegramAuthGuard } from '../auth/telegram-auth.guard.js';
import type { User } from '../db/schema.js';
import { LogWeightDto } from './dto/log-weight.dto.js';
import { WeightHistoryQueryDto } from './dto/weight-history-query.dto.js';
import { WeightService } from './weight.service.js';

@Controller('weight')
@UseGuards(TelegramAuthGuard)
export class WeightController {
  constructor(private readonly weight: WeightService) {}

  @Post()
  log(@CurrentUser() user: User, @Body() body: LogWeightDto) {
    return this.weight.log(user.id, body.weightKg, body.date ?? todayIn(user.timezone));
  }

  @Get()
  history(@CurrentUser() user: User, @Query() query: WeightHistoryQueryDto) {
    return this.weight.history(user.id, query.from, query.to);
  }
}
