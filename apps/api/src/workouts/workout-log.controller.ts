import { Body, Controller, Delete, Get, HttpCode, Put, Query, UseGuards } from '@nestjs/common';
import { todayIn } from '@fitpal/shared';
import { CurrentUser, TelegramAuthGuard } from '../auth/telegram-auth.guard.js';
import type { User } from '../db/schema.js';
import { LogExerciseDto } from './dto/log-exercise.dto.js';
import { UnlogExerciseDto } from './dto/unlog-exercise.dto.js';
import { WorkoutLogQueryDto } from './dto/workout-log-query.dto.js';
import { WorkoutLogService } from './workout-log.service.js';

/** Отдельный префикс, чтобы не пересекаться с `/workouts/:id`. */
@Controller('workout-log')
@UseGuards(TelegramAuthGuard)
export class WorkoutLogController {
  constructor(private readonly log: WorkoutLogService) {}

  @Get()
  list(@CurrentUser() user: User, @Query() query: WorkoutLogQueryDto) {
    return this.log.list(user.id, query.from, query.to);
  }

  @Put()
  done(@CurrentUser() user: User, @Body() body: LogExerciseDto) {
    return this.log.log(user.id, { ...body, date: body.date ?? todayIn(user.timezone) });
  }

  @Delete()
  @HttpCode(204)
  undo(@CurrentUser() user: User, @Query() query: UnlogExerciseDto) {
    return this.log.unlog(user.id, query.exerciseId, query.date ?? todayIn(user.timezone));
  }
}
