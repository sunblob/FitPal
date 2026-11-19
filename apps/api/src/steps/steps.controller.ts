import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { todayIn } from '@fitpal/shared';
import { CurrentUser, TelegramAuthGuard } from '../auth/telegram-auth.guard.js';
import type { User } from '../db/schema.js';
import { LogStepsDto } from './dto/log-steps.dto.js';
import { StepsHistoryQueryDto } from './dto/steps-history-query.dto.js';
import { StepsService } from './steps.service.js';

@Controller('steps')
@UseGuards(TelegramAuthGuard)
export class StepsController {
  constructor(private readonly steps: StepsService) {}

  @Put()
  log(@CurrentUser() user: User, @Body() body: LogStepsDto) {
    return this.steps.log(user.id, body.steps, body.date ?? todayIn(user.timezone));
  }

  @Get()
  history(@CurrentUser() user: User, @Query() query: StepsHistoryQueryDto) {
    return this.steps.history(user.id, query.from, query.to);
  }
}
