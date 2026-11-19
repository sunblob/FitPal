import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Env } from '../config/env.js';
import { verifyAdminSession } from './admin-auth.js';

/** Админка: заголовок `Authorization: Bearer <session>` и Telegram ID из ADMIN_TELEGRAM_IDS. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly env: Env) {}

  canActivate(ctx: ExecutionContext): boolean {
    if (this.env.ADMIN_TELEGRAM_IDS.length === 0) throw new ForbiddenException();
    const req = ctx.switchToHttp().getRequest<Request>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();

    const telegramId = verifyAdminSession(token, this.env.TELEGRAM_BOT_TOKEN);
    // Список проверяется на каждом запросе: убрал ID из env — доступ пропал сразу
    if (telegramId === null || !this.env.ADMIN_TELEGRAM_IDS.includes(telegramId)) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
