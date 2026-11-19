import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { todayIn } from '@fitpal/shared';
import { CurrentUser, TelegramAuthGuard } from '../auth/telegram-auth.guard.js';
import type { User } from '../db/schema.js';
import { LogWaterDto } from './dto/log-water.dto.js';
import { WaterDayQueryDto } from './dto/water-day-query.dto.js';
import { WaterService } from './water.service.js';

@Controller('water')
@UseGuards(TelegramAuthGuard)
export class WaterController {
  constructor(private readonly water: WaterService) {}

  @Get()
  day(@CurrentUser() user: User, @Query() query: WaterDayQueryDto) {
    return this.water.day(user.id, query.date);
  }

  @Put()
  log(@CurrentUser() user: User, @Body() body: LogWaterDto) {
    return this.water.log(user.id, body.ml, body.date ?? todayIn(user.timezone));
  }
}
