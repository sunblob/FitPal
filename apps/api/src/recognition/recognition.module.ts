import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { RecognitionController } from './recognition.controller.js';
import { RecognitionService } from './recognition.service.js';

@Module({
  imports: [UsersModule],
  controllers: [RecognitionController],
  providers: [RecognitionService],
  exports: [RecognitionService],
})
export class RecognitionModule {}
