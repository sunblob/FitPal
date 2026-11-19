import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { generateWorkoutPlanSchema, type GenerateWorkoutPlan } from '@fitpal/shared';
import { CurrentUser, TelegramAuthGuard } from '../auth/telegram-auth.guard.js';
import { ZodPipe } from '../common/zod.pipe.js';
import type { User } from '../db/schema.js';
import { WorkoutsService } from './workouts.service.js';

@Controller('workouts')
@UseGuards(TelegramAuthGuard)
export class WorkoutsController {
  constructor(private readonly workouts: WorkoutsService) {}

  @Post('generate')
  generate(
    @CurrentUser() user: User,
    @Body(new ZodPipe(generateWorkoutPlanSchema)) body: GenerateWorkoutPlan,
  ) {
    return this.workouts.generate(user, body);
  }

  @Get()
  list(@CurrentUser() user: User) {
    return this.workouts.list(user.id);
  }

  @Get(':id')
  get(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.workouts.get(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.workouts.remove(user.id, id);
  }
}
