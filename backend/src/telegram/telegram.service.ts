import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpensesService } from '../expenses/expenses.service';
import { AiService } from '../ai/ai.service';
import TelegramBot = require('node-telegram-bot-api');

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: TelegramBot;
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private configService: ConfigService,
    private expensesService: ExpensesService,
    private aiService: AiService,
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
            `👋 Welcome to RupeePilot!\n\nJust send me a message like:\n"Spent 450 at Zomato"\n"Paid 1200 for electricity"\n\nI'll track it automatically.`,
          );
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
