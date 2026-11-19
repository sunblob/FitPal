import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Env } from '../config/env.js';
import * as schema from './schema.js';

export type Database = PostgresJsDatabase<typeof schema>;
export const DB = Symbol('DB');
const SQL = Symbol('SQL');

@Injectable()
class DbShutdown implements OnApplicationShutdown {
  constructor(@Inject(SQL) private readonly sql: postgres.Sql) {}

  async onApplicationShutdown() {
    await this.sql.end({ timeout: 5 });
  }
}

@Global()
@Module({
  providers: [
    {
      provide: SQL,
      inject: [Env],
      useFactory: (env: Env) => postgres(env.DATABASE_URL),
    },
    {
      provide: DB,
      inject: [SQL],
      useFactory: (sql: postgres.Sql): Database => drizzle(sql, { schema }),
    },
    DbShutdown,
  ],
  exports: [DB],
})
export class DbModule {}
