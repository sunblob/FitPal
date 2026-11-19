import { Body, Controller, ForbiddenException, Headers, HttpCode, Post } from '@nestjs/common';
import type { Update } from 'grammy/types';
import { Env } from '../config/env.js';
import { BotService, WEBHOOK_PATH } from './bot.service.js';

@Controller(WEBHOOK_PATH)
export class BotController {
  constructor(
    private readonly env: Env,
    private readonly botService: BotService,
  ) {}

  @Post()
  @HttpCode(200)
  async webhook(
    @Body() update: Update,
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
  ) {
    if (this.env.TELEGRAM_WEBHOOK_SECRET && secret !== this.env.TELEGRAM_WEBHOOK_SECRET) {
      throw new ForbiddenException();
    }
    await this.botService.handleUpdate(update);
  }
}
