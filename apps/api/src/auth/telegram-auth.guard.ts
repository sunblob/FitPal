import {
  createParamDecorator,
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Env } from '../config/env.js';
import type { User } from '../db/schema.js';
import { UsersService } from '../users/users.service.js';
import { validateInitData } from './init-data.js';

type AuthedRequest = Request & { user?: User };

/** Авторизация Mini App: заголовок `Authorization: tma <initData>`. */
@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(
    private readonly env: Env,
    private readonly users: UsersService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const [scheme, initData] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'tma' || !initData) throw new UnauthorizedException();

    const tgUser = validateInitData(initData, this.env.TELEGRAM_BOT_TOKEN);
    if (!tgUser) throw new UnauthorizedException();

    req.user = await this.users.upsertFromTelegram(tgUser);
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthedRequest>().user,
);
