import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit сам не читает .env, подгружаем корневой
for (const file of ['.env', '../../.env']) {
  if (existsSync(file)) {
    process.loadEnvFile(file);
    break;
  }
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://fitpal:fitpal@localhost:5432/fitpal',
  },
});
