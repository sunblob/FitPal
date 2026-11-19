import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AdminSession } from '@fitpal/shared';
import { UuidParamDto } from '../common/dto/uuid-param.dto.js';
import { Env } from '../config/env.js';
import { signAdminSession, verifyTelegramLogin } from './admin-auth.js';
import { AdminGuard } from './admin.guard.js';
import { AdminService } from './admin.service.js';
import { AdminDiaryQueryDto } from './dto/admin-diary-query.dto.js';
import { AdminDiaryUpdateDto } from './dto/admin-diary-update.dto.js';
import { AdminExerciseUpdateDto } from './dto/admin-exercise-update.dto.js';
import { AdminFoodCreateDto } from './dto/admin-food-create.dto.js';
import { AdminFoodUpdateDto } from './dto/admin-food-update.dto.js';
import { AdminFoodsQueryDto } from './dto/admin-foods-query.dto.js';
import { AdminListQueryDto } from './dto/admin-list-query.dto.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';
import { AdminUserUpdateDto } from './dto/admin-user-update.dto.js';
import { ExerciseIdParamDto } from './dto/exercise-id-param.dto.js';

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly env: Env) {}

  /** Вход через Telegram Login Widget; пускаем только ID из ADMIN_TELEGRAM_IDS. */
  @Post('login')
  @HttpCode(200)
  login(@Body() body: AdminLoginDto): AdminSession {
    if (this.env.ADMIN_TELEGRAM_IDS.length === 0) throw new ForbiddenException();
    if (!verifyTelegramLogin(body, this.env.TELEGRAM_BOT_TOKEN)) {
      throw new UnauthorizedException();
    }
    if (!this.env.ADMIN_TELEGRAM_IDS.includes(body.id)) throw new ForbiddenException();
    const { token, expiresAt } = signAdminSession(body.id, this.env.TELEGRAM_BOT_TOKEN);
    const name = [body.first_name, body.last_name].filter(Boolean).join(' ') || `${body.id}`;
    return { token, expiresAt: expiresAt.toISOString(), telegramId: body.id, name };
  }
}

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('users')
  users(@Query() query: AdminListQueryDto) {
    return this.admin.listUsers(query);
  }

  @Patch('users/:id')
  updateUser(@Param() { id }: UuidParamDto, @Body() body: AdminUserUpdateDto) {
    return this.admin.updateUser(id, body);
  }

  @Delete('users/:id')
  @HttpCode(204)
  deleteUser(@Param() { id }: UuidParamDto) {
    return this.admin.deleteUser(id);
  }

  @Get('foods')
  foods(@Query() query: AdminFoodsQueryDto) {
    return this.admin.listFoods(query);
  }

  @Post('foods')
  createFood(@Body() body: AdminFoodCreateDto) {
    return this.admin.createFood(body);
  }

  @Patch('foods/:id')
  updateFood(@Param() { id }: UuidParamDto, @Body() body: AdminFoodUpdateDto) {
    return this.admin.updateFood(id, body);
  }

  @Delete('foods/:id')
  @HttpCode(204)
  deleteFood(@Param() { id }: UuidParamDto) {
    return this.admin.deleteFood(id);
  }

  @Get('exercises')
  exercises(@Query() query: AdminListQueryDto) {
    return this.admin.listExercises(query);
  }

  @Patch('exercises/:id')
  updateExercise(@Param() { id }: ExerciseIdParamDto, @Body() body: AdminExerciseUpdateDto) {
    return this.admin.updateExercise(id, body);
  }

  @Get('diary')
  diary(@Query() query: AdminDiaryQueryDto) {
    return this.admin.listDiary(query);
  }

  @Patch('diary/:id')
  updateDiary(@Param() { id }: UuidParamDto, @Body() body: AdminDiaryUpdateDto) {
    return this.admin.updateDiary(id, body);
  }

  @Delete('diary/:id')
  @HttpCode(204)
  deleteDiary(@Param() { id }: UuidParamDto) {
    return this.admin.deleteDiary(id);
  }
}
