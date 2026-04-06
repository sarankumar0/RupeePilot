import { Controller, Post, Req, Res } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import type { Request, Response } from 'express';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  // Telegram calls this endpoint for every message when running in webhook mode
  @Post('webhook')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    this.telegramService.processUpdate(req.body);
    res.sendStatus(200);
  }
}
