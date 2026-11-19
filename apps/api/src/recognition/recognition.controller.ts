import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, TelegramAuthGuard } from '../auth/telegram-auth.guard.js';
import type { User } from '../db/schema.js';
import { RecognizePhotoDto } from './dto/recognize-photo.dto.js';
import { RecognizeTextDto } from './dto/recognize-text.dto.js';
import { RecognitionService } from './recognition.service.js';

@Controller('recognize')
@UseGuards(TelegramAuthGuard)
export class RecognitionController {
  constructor(private readonly recognition: RecognitionService) {}

  @Post()
  recognize(@CurrentUser() user: User, @Body() body: RecognizePhotoDto) {
    return this.recognition.recognize(
      user.id,
      { mediaType: body.mediaType, data: body.data },
      body.hint,
    );
  }

  @Post('text')
  recognizeText(@CurrentUser() user: User, @Body() body: RecognizeTextDto) {
    return this.recognition.recognizeText(user.id, body.text);
  }
}
