import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { StepsController } from './steps.controller.js';
import { StepsService } from './steps.service.js';

@Module({
  imports: [UsersModule],
  controllers: [StepsController],
  providers: [StepsService],
})
export class StepsModule {}
