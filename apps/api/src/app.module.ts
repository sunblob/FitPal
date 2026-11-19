import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { DbModule } from './db/db.module.js';
import { UsersModule } from './users/users.module.js';
import { BotModule } from './bot/bot.module.js';
import { WeightModule } from './weight/weight.module.js';
import { StepsModule } from './steps/steps.module.js';
import { WaterModule } from './water/water.module.js';
import { FoodsModule } from './foods/foods.module.js';
import { DiaryModule } from './diary/diary.module.js';
import { RecognitionModule } from './recognition/recognition.module.js';
import { AiModule } from './ai/ai.module.js';
import { ExercisesModule } from './exercises/exercises.module.js';
import { WorkoutsModule } from './workouts/workouts.module.js';
import { AdminModule } from './admin/admin.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [
    ConfigModule,
    DbModule,
    UsersModule,
    WeightModule,
    StepsModule,
    WaterModule,
    FoodsModule,
    DiaryModule,
    RecognitionModule,
    AiModule,
    ExercisesModule,
    WorkoutsModule,
    BotModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
