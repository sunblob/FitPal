import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, TelegramAuthGuard } from '../auth/telegram-auth.guard.js';
import { UuidParamDto } from '../common/dto/uuid-param.dto.js';
import type { User } from '../db/schema.js';
import { GenerateWorkoutPlanDto } from './dto/generate-workout-plan.dto.js';
import { WorkoutsService } from './workouts.service.js';

@Controller('workouts')
@UseGuards(TelegramAuthGuard)
export class WorkoutsController {
  constructor(private readonly workouts: WorkoutsService) {}

  @Post('generate')
  generate(@CurrentUser() user: User, @Body() body: GenerateWorkoutPlanDto) {
    return this.workouts.generate(user, body);
  }

  @Get()
  list(@CurrentUser() user: User) {
    return this.workouts.list(user.id);
  }

  @Get(':id')
  get(@CurrentUser() user: User, @Param() { id }: UuidParamDto) {
    return this.workouts.get(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: User, @Param() { id }: UuidParamDto) {
    return this.workouts.remove(user.id, id);
  }
}
