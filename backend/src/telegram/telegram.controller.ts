import { Controller, Post, Get, Req, Res, Headers, UnauthorizedException } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import type { Request, Response } from 'express';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  // Telegram calls this endpoint for every message in webhook mode
  @Post('webhook')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    this.telegramService.processUpdate(req.body);
    res.sendStatus(200);
  }

  // Vercel Cron hits this every Sunday 8 PM IST to send weekly reports
  @Get('weekly-report')
  async triggerWeeklyReport(@Headers('authorization') auth: string) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && auth !== `Bearer ${cronSecret}`) {
      throw new UnauthorizedException();
    }
    await this.telegramService.sendWeeklyReportToAll();
    return { ok: true };
  }
}
