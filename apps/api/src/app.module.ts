import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { DbModule } from './db/db.module.js';
import { UsersModule } from './users/users.module.js';
import { BotModule } from './bot/bot.module.js';
import { WeightModule } from './weight/weight.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [ConfigModule, DbModule, UsersModule, WeightModule, BotModule],
  controllers: [HealthController],
})
export class AppModule {}
