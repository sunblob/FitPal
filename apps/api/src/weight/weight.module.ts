import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { WeightController } from './weight.controller.js';
import { WeightService } from './weight.service.js';

@Module({
  imports: [UsersModule],
  controllers: [WeightController],
  providers: [WeightService],
  exports: [WeightService],
})
export class WeightModule {}
