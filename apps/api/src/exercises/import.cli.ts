/**
 * Импорт каталога упражнений из free-exercise-db и перевод названий и техники на русский.
 * Уже переведённое не трогает, поэтому повторный запуск доделывает только недостающее.
 *
 *   pnpm --filter @fitpal/api exercises:import            # импорт + перевод
 *   pnpm --filter @fitpal/api exercises:import --no-translate
 *   pnpm --filter @fitpal/api exercises:import --url=https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
 */
import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AiModule } from '../ai/ai.module.js';
import { ClaudeService } from '../ai/claude.service.js';
import { ConfigModule } from '../config/config.module.js';
import { DbModule } from '../db/db.module.js';
import { ExercisesModule } from './exercises.module.js';
import { ExercisesService } from './exercises.service.js';

@Module({ imports: [ConfigModule, DbModule, AiModule, ExercisesModule] })
class ImportModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(ImportModule, {
    logger: ['log', 'warn', 'error'],
  });
  const log = new Logger('ExercisesImport');
  try {
    const service = app.get(ExercisesService);
    const url = process.argv.find((a) => a.startsWith('--url='))?.slice('--url='.length);
    const count = await service.importCatalog(url);
    log.log(`Импортировано упражнений: ${count}`);

    if (process.argv.includes('--no-translate')) return;
    if (!app.get(ClaudeService).enabled) {
      log.warn('ANTHROPIC_API_KEY не задан, названия и техника останутся на английском');
      return;
    }
    const translated = await service.translateMissingNames();
    log.log(`Переведено названий: ${translated}`);
    const instructions = await service.translateMissingInstructions();
    log.log(`Переведено инструкций: ${instructions}`);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
