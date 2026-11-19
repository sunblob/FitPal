import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/** Применяет SQL-миграции из apps/api/drizzle. Запускается перед стартом API в контейнере. */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const sql = postgres(url, { max: 1 });
  try {
    const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));
    await migrate(drizzle(sql), { migrationsFolder });
    console.log('Migrations applied');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
