import { Module } from '@nestjs/common';
import { ExercisesModule } from '../exercises/exercises.module.js';
import { UsersModule } from '../users/users.module.js';
import { WorkoutLogController } from './workout-log.controller.js';
import { WorkoutLogService } from './workout-log.service.js';
import { WorkoutsController } from './workouts.controller.js';
import { WorkoutsService } from './workouts.service.js';

@Module({
  imports: [UsersModule, ExercisesModule],
  controllers: [WorkoutsController, WorkoutLogController],
  providers: [WorkoutsService, WorkoutLogService],
})
export class WorkoutsModule {}
