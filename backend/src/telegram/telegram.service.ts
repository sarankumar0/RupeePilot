import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpensesService } from '../expenses/expenses.service';
import { AiService } from '../ai/ai.service';
import { UsersService } from '../users/users.service';
import TelegramBot = require('node-telegram-bot-api');
import * as cron from 'node-cron';

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

  // Called after every expense save — checks if user is near or over budget
  private async checkBudgetAlert(chatId: number, telegramUserId: number) {
    // Load user to get their monthly budget
    const user = await this.usersService.findByTelegramId(telegramUserId);

    // If no budget is set (0), skip — user hasn't configured one yet
    if (!user || !user.monthlyBudget || user.monthlyBudget <= 0) return;

    // Get this month's total spend
    const summary = await this.expensesService.getSummary(telegramUserId);
    const spent = summary.thisMonthTotal;
    const budget = user.monthlyBudget;
    const percent = (spent / budget) * 100;

    // Format numbers in Indian style — e.g. 10,000
    const spentStr = `₹${spent.toLocaleString('en-IN')}`;
    const budgetStr = `₹${budget.toLocaleString('en-IN')}`;

    if (percent >= 100) {
      // Over budget
      await this.bot.sendMessage(
        chatId,
        `🚨 *Budget Exceeded!*\n\nYou've spent ${spentStr} this month against your ${budgetStr} budget.\n\nTry to hold off on non-essential spending for the rest of the month.`,
        { parse_mode: 'Markdown' },
      );
    } else if (percent >= 80) {
      // 80% warning
      const remaining = budget - spent;
      const remainingStr = `₹${remaining.toLocaleString('en-IN')}`;
      await this.bot.sendMessage(
        chatId,
        `⚠️ *Budget Warning!*\n\nYou've used ${Math.round(percent)}% of your monthly budget.\n\nSpent: ${spentStr} / ${budgetStr}\nRemaining: ${remainingStr}`,
        { parse_mode: 'Markdown' },
      );
    }
    // Below 80% — no alert needed
  }

  // Build and send the weekly report to a single user
  private async sendWeeklyReport(chatId: number, telegramUserId: number) {
    const user = await this.usersService.findByTelegramId(telegramUserId);
    if (!user) return;

    const week = await this.expensesService.getWeekSummary(telegramUserId);

    // If nothing was spent this week, skip
    if (week.thisWeekTotal === 0) {
      await this.bot.sendMessage(chatId, `📊 *Weekly Report*\n\nNo expenses logged this week. Start tracking by sending me a message like "Spent 450 at Zomato"!`, { parse_mode: 'Markdown' });
      return;
    }

    const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

    // Week-over-week comparison line
    let weekCompareLine = '';
    if (week.lastWeekTotal > 0) {
      const diff = week.thisWeekTotal - week.lastWeekTotal;
      const sign = diff >= 0 ? '+' : '';
      const emoji = diff > 0 ? '📈' : '📉';
      weekCompareLine = `${emoji} vs last week: ${sign}${fmt(Math.abs(diff))} (${sign}${Math.round((diff / week.lastWeekTotal) * 100)}%)\n`;
    }

    // Budget pace line — only if budget is set
    let budgetLine = '';
    if (user.monthlyBudget > 0) {
      const pct = Math.round((week.thisMonthTotal / user.monthlyBudget) * 100);
      const budgetEmoji = pct >= 100 ? '🚨' : pct >= 80 ? '⚠️' : '✅';
      budgetLine = `${budgetEmoji} Monthly budget: ${fmt(week.thisMonthTotal)} / ${fmt(user.monthlyBudget)} (${pct}% used)\n`;
    }

    // Income line — only if income is set
    let incomeLine = '';
    if (user.monthlyIncome > 0) {
      const incPct = Math.round((week.thisMonthTotal / user.monthlyIncome) * 100);
      incomeLine = `💼 Monthly income: ${fmt(user.monthlyIncome)} → ${incPct}% spent so far\n`;
    }

    // Category breakdown
    const categoryEmojis: Record<string, string> = {
      Food: '🍔', Transport: '🚗', Shopping: '🛍', Entertainment: '🎬',
      Health: '🏥', Utilities: '💡', EMI: '🏦', Others: '📦',
    };
    const categoryLines = week.byCategory
      .map(({ category, total }) => {
        const pct = Math.round((total / week.thisWeekTotal) * 100);
        const emoji = categoryEmojis[category] ?? '📦';
        return `  ${emoji} ${category.padEnd(13)} ${fmt(total)} (${pct}%)`;
      })
      .join('\n');

    // Biggest expense line
    let biggestLine = '';
    if (week.biggestExpense) {
      biggestLine = `🔺 Biggest: ${fmt(week.biggestExpense.amount)} at ${week.biggestExpense.merchant}\n`;
    }

    // Heaviest day line
    let heaviestLine = '';
    if (week.heaviestDay) {
      heaviestLine = `📆 Heaviest day: ${week.heaviestDay}\n`;
    }

    // AI tip — gracefully skip if Groq fails
    let tipLine = '';
    try {
      const topCat = week.byCategory[0]?.category ?? 'Others';
      const tip = await this.aiService.generateWeeklyTip(topCat, week.thisWeekTotal);
      if (tip) tipLine = `\n💡 *Tip:* ${tip}`;
    } catch {
      // Don't let AI failure break the report
    }

    const message =
      `📊 *Weekly Report*\n\n` +
      `💸 This week: *${fmt(week.thisWeekTotal)}*\n` +
      weekCompareLine +
      `\n📅 *This month so far:* ${fmt(week.thisMonthTotal)}\n` +
      budgetLine +
      incomeLine +
      `\n📂 *Category Breakdown:*\n\`\`\`\n${categoryLines}\n\`\`\`\n` +
      biggestLine +
      heaviestLine +
      tipLine;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN')!;
    this.bot = new TelegramBot(token, { polling: true });

    this.logger.log('Telegram bot started (polling)');

    // Weekly report — every Sunday at 8:00 PM IST (2:30 PM UTC)
    cron.schedule('30 14 * * 0', async () => {
      this.logger.log('Running weekly report cron job...');
      try {
        const users = await this.usersService.findAllLinked();
        this.logger.log(`Sending weekly report to ${users.length} users`);
        for (const user of users) {
          try {
            await this.sendWeeklyReport(user.telegramUserId, user.telegramUserId);
          } catch (err) {
            this.logger.error(`Failed to send weekly report to ${user.email}`, err);
          }
        }
      } catch (err) {
        this.logger.error('Weekly report cron failed', err);
      }
    });

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

        // After saving, check if the user has a budget set and send an alert if needed
        if (msg.from?.id) {
          await this.checkBudgetAlert(chatId, msg.from.id);
        }
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
