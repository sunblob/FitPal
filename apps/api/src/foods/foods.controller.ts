import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, TelegramAuthGuard } from '../auth/telegram-auth.guard.js';
import type { User } from '../db/schema.js';
import { CreateFoodDto } from './dto/create-food.dto.js';
import { FoodSearchQueryDto } from './dto/food-search-query.dto.js';
import { FoodsService } from './foods.service.js';

@Controller('foods')
@UseGuards(TelegramAuthGuard)
export class FoodsController {
  constructor(private readonly foods: FoodsService) {}

  @Get()
  search(@CurrentUser() user: User, @Query() query: FoodSearchQueryDto) {
    return this.foods.search(user.id, query.q);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() body: CreateFoodDto) {
    return this.foods.create(user.id, body);
  }
}
