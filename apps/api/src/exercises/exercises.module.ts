import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { ExercisesController } from './exercises.controller.js';
import { ExercisesService } from './exercises.service.js';

@Module({
  imports: [UsersModule],
  controllers: [ExercisesController],
  providers: [ExercisesService],
  exports: [ExercisesService],
})
export class ExercisesModule {}
