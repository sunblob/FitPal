import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, TelegramAuthGuard } from '../auth/telegram-auth.guard.js';
import { UuidParamDto } from '../common/dto/uuid-param.dto.js';
import type { User } from '../db/schema.js';
import { BarcodeParamDto } from './dto/barcode-param.dto.js';
import { CreateFoodDto } from './dto/create-food.dto.js';
import { FoodSearchQueryDto } from './dto/food-search-query.dto.js';
import { FoodsService } from './foods.service.js';

@Controller('foods')
@UseGuards(TelegramAuthGuard)
export class FoodsController {
  constructor(private readonly foods: FoodsService) {}

  @Get()
  search(@CurrentUser() user: User, @Query() query: FoodSearchQueryDto) {
    return this.foods.search(user.id, query.q, user.language);
  }

  @Get('recent')
  recent(@CurrentUser() user: User) {
    return this.foods.recent(user.id, user.language);
  }

  @Get('favorites')
  favorites(@CurrentUser() user: User) {
    return this.foods.favorites(user.id, user.language);
  }

  @Put(':id/favorite')
  @HttpCode(204)
  addFavorite(@CurrentUser() user: User, @Param() { id }: UuidParamDto) {
    return this.foods.addFavorite(user.id, id);
  }

  @Delete(':id/favorite')
  @HttpCode(204)
  removeFavorite(@CurrentUser() user: User, @Param() { id }: UuidParamDto) {
    return this.foods.removeFavorite(user.id, id);
  }

  @Get('barcode/:code')
  byBarcode(@CurrentUser() user: User, @Param() { code }: BarcodeParamDto) {
    return this.foods.byBarcode(code, user.language);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() body: CreateFoodDto) {
    return this.foods.create(user.id, body, user.language);
  }
}
