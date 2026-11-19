import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard.js';
import { ExercisesService } from './exercises.service.js';

@Controller('exercises')
@UseGuards(TelegramAuthGuard)
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get(':id')
  get(@Param('id') id: string) {
    return this.exercises.getDetails(id);
  }
}
