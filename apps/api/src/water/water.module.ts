import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { WaterController } from './water.controller.js';
import { WaterService } from './water.service.js';

@Module({
  imports: [UsersModule],
  controllers: [WaterController],
  providers: [WaterService],
})
export class WaterModule {}
