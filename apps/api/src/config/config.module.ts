import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { Env, envSchema } from './env.js';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: ['.env', '../../.env'],
      validate: (raw) => envSchema.parse(raw),
    }),
  ],
  providers: [
    {
      provide: Env,
      useFactory: () => envSchema.parse(process.env),
    },
  ],
  exports: [Env],
})
export class ConfigModule {}
