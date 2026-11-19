import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { logWeightSchema, type LogWeight } from '@fitpal/shared';
import { CurrentUser, TelegramAuthGuard } from '../auth/telegram-auth.guard.js';
import { ZodPipe } from '../common/zod.pipe.js';
import type { User } from '../db/schema.js';
import { WeightService } from './weight.service.js';

@Controller('weight')
@UseGuards(TelegramAuthGuard)
export class WeightController {
  constructor(private readonly weight: WeightService) {}

  @Post()
  log(@CurrentUser() user: User, @Body(new ZodPipe(logWeightSchema)) body: LogWeight) {
    return this.weight.log(user.id, body.weightKg, body.date);
  }

  @Get()
  history(@CurrentUser() user: User, @Query('from') from?: string, @Query('to') to?: string) {
    return this.weight.history(user.id, from, to);
  }
}
