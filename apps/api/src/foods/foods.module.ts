import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { FoodsController } from './foods.controller.js';
import { FoodsService } from './foods.service.js';

@Module({
  imports: [UsersModule],
  controllers: [FoodsController],
  providers: [FoodsService],
  exports: [FoodsService],
})
export class FoodsModule {}
