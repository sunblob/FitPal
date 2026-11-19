import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module.js';
import { Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Фото для распознавания приходят в base64, стандартных 100 КБ не хватает
  app.useBodyParser('json', { limit: '10mb' });
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(new ZodValidationPipe());
  app.enableShutdownHooks();

  const env = app.get(Env);
  await app.listen(env.PORT);
  Logger.log(`API listening on :${env.PORT}`, 'Bootstrap');
}

void bootstrap();
