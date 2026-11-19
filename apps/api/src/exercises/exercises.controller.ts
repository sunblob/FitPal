import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser, TelegramAuthGuard } from '../auth/telegram-auth.guard.js';
import type { User } from '../db/schema.js';
import { ExercisesService } from './exercises.service.js';

@Controller('exercises')
@UseGuards(TelegramAuthGuard)
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get(':id')
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.exercises.getDetails(id, user.language);
  }
}
