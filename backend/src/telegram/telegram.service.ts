import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpensesService } from '../expenses/expenses.service';
import { AiService } from '../ai/ai.service';
import { UsersService } from '../users/users.service';
import TelegramBot = require('node-telegram-bot-api');

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: TelegramBot;
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private configService: ConfigService,
    private expensesService: ExpensesService,
    private aiService: AiService,
    private usersService: UsersService,
  ) {}

  onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN')!;
    this.bot = new TelegramBot(token, { polling: true });

    this.logger.log('Telegram bot started (polling)');

    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;

      if (!text || text.startsWith('/')) {
        if (text === '/start') {
          await this.bot.sendMessage(
            chatId,
            `👋 Welcome to RupeePilot!\n\nJust send me a message like:\n"Spent 450 at Zomato"\n"Paid 1200 for electricity"\n\nI'll track it automatically.\n\nTo connect your web dashboard, go to the dashboard and click "Link Telegram" — then type the code here.`,
          );
        }

        // /link <code> — user types this after generating a code on the dashboard
        // e.g. /link XK7P2M
        if (text?.startsWith('/link ')) {
          const code = text.split(' ')[1]?.trim().toUpperCase();

          if (!code) {
            await this.bot.sendMessage(chatId, '❌ Please type the code like this: /link XK7P2M');
            return;
          }

          const user = await this.usersService.linkByCode(code, msg.from!.id);

          if (!user) {
            await this.bot.sendMessage(
              chatId,
              '❌ Code not found or already used. Go to the dashboard and generate a new code.',
            );
          } else {
            await this.bot.sendMessage(
              chatId,
              `✅ Telegram linked to your RupeePilot account!\n\nFrom now on, every expense you send here will appear on your dashboard.`,
            );
          }
        }

        return;
      }

      try {
        await this.bot.sendMessage(chatId, '⏳ Parsing your expense...');

        const parsed = await this.aiService.parseExpense(text);
        const expense = await this.expensesService.create({
          amount: parsed.amount,
          merchant: parsed.merchant,
          category: parsed.category,
          rawMessage: text,
          telegramUserId: msg.from?.id,
        });

        await this.bot.sendMessage(
          chatId,
          `✅ Saved!\n\n💰 Amount: ₹${expense.amount}\n🏪 Merchant: ${expense.merchant}\n📂 Category: ${expense.category}`,
        );
      } catch (err) {
        this.logger.error('Failed to parse expense', err);
        await this.bot.sendMessage(
          chatId,
          `❌ Sorry, I couldn't understand that. Try something like:\n"Spent 450 at Zomato"`,
        );
      }
    });
  }
}
