import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpensesService } from '../expenses/expenses.service';
import { InvestmentsService } from '../investments/investments.service';
import { AiService } from '../ai/ai.service';
import { UsersService } from '../users/users.service';
import TelegramBot = require('node-telegram-bot-api');

// Shape of the investment conversation state saved in MongoDB
// Mirrors the pendingInvestmentState field on the User schema
interface PendingInvestmentState {
  step: 'confirm' | 'choose_type' | 'stock_details';
  amount: number;
  name: string;
  rawMessage: string;
  type?: string;
  knownQuantity?: number;
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot!: TelegramBot;
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private configService: ConfigService,
    private expensesService: ExpensesService,
    private investmentsService: InvestmentsService,
    private aiService: AiService,
    private usersService: UsersService,
  ) {}

  private async checkBudgetAlert(chatId: number, telegramUserId: number) {
    const user = await this.usersService.findByTelegramId(telegramUserId);
    if (!user || !user.monthlyBudget || user.monthlyBudget <= 0) return;
    const summary = await this.expensesService.getSummary(telegramUserId, user.salaryDate ?? 1);
    const spent = summary.thisMonthTotal;
    const budget = user.monthlyBudget;
    const percent = (spent / budget) * 100;
    const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
    if (percent >= 100) {
      await this.bot.sendMessage(chatId, `🚨 *Budget Exceeded!*\n\nYou've spent ${fmt(spent)} this month against your ${fmt(budget)} budget.\n\nTry to hold off on non-essential spending.`, { parse_mode: 'Markdown' });
    } else if (percent >= 80) {
      const remaining = budget - spent;
      await this.bot.sendMessage(chatId, `⚠️ *Budget Warning!*\n\nYou've used ${Math.round(percent)}% of your monthly budget.\n\nSpent: ${fmt(spent)} / ${fmt(budget)}\nRemaining: ${fmt(remaining)}`, { parse_mode: 'Markdown' });
    }
  }

  async sendWeeklyReportToAll() {
    const users = await this.usersService.findAllLinked();
    for (const user of users) {
      try {
        await this.sendWeeklyReport(user.telegramUserId, user.telegramUserId);
      } catch (err) {
        this.logger.error(`Failed to send weekly report to ${user.email}`, err);
      }
    }
  }

  private async sendWeeklyReport(chatId: number, telegramUserId: number) {
    const user = await this.usersService.findByTelegramId(telegramUserId);
    if (!user) return;
    const week = await this.expensesService.getWeekSummary(telegramUserId, user.salaryDate ?? 1);
    if (week.thisWeekTotal === 0) {
      await this.bot.sendMessage(chatId, `📊 *Weekly Report*\n\nNo expenses logged this week. Start tracking by sending me a message like "Spent 450 at Zomato"!`, { parse_mode: 'Markdown' });
      return;
    }
    const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
    let weekCompareLine = '';
    if (week.lastWeekTotal > 0) {
      const diff = week.thisWeekTotal - week.lastWeekTotal;
      const sign = diff >= 0 ? '+' : '';
      const emoji = diff > 0 ? '📈' : '📉';
      weekCompareLine = `${emoji} vs last week: ${sign}${fmt(Math.abs(diff))} (${sign}${Math.round((diff / week.lastWeekTotal) * 100)}%)\n`;
    }
    let budgetLine = '';
    if (user.monthlyBudget > 0) {
      const pct = Math.round((week.thisMonthTotal / user.monthlyBudget) * 100);
      const budgetEmoji = pct >= 100 ? '🚨' : pct >= 80 ? '⚠️' : '✅';
      budgetLine = `${budgetEmoji} Monthly budget: ${fmt(week.thisMonthTotal)} / ${fmt(user.monthlyBudget)} (${pct}% used)\n`;
    }
    let incomeLine = '';
    if (user.monthlyIncome > 0) {
      const incPct = Math.round((week.thisMonthTotal / user.monthlyIncome) * 100);
      incomeLine = `💼 Monthly income: ${fmt(user.monthlyIncome)} → ${incPct}% spent so far\n`;
    }
    const categoryEmojis: Record<string, string> = {
      Food: '🍔', Transport: '🚗', Shopping: '🛍', Entertainment: '🎬',
      Health: '🏥', Utilities: '💡', EMI: '🏦', Housing: '🏠',
      Learning: '📚', Insurance: '🛡️', Others: '📦',
    };
    const categoryLines = week.byCategory
      .map(({ category, total }) => {
        const pct = Math.round((total / week.thisWeekTotal) * 100);
        const emoji = categoryEmojis[category] ?? '📦';
        return `  ${emoji} ${category.padEnd(13)} ${fmt(total)} (${pct}%)`;
      })
      .join('\n');
    let biggestLine = '';
    if (week.biggestExpense) biggestLine = `🔺 Biggest: ${fmt(week.biggestExpense.amount)} at ${week.biggestExpense.merchant}\n`;
    let heaviestLine = '';
    if (week.heaviestDay) heaviestLine = `📆 Heaviest day: ${week.heaviestDay}\n`;
    let tipLine = '';
    try {
      const topCat = week.byCategory[0]?.category ?? 'Others';
      const tip = await this.aiService.generateWeeklyTip(topCat, week.thisWeekTotal);
      if (tip) tipLine = `\n💡 *Tip:* ${tip}`;
    } catch { /* Don't let AI failure break the report */ }
    const message =
      `📊 *Weekly Report*\n\n` +
      `💸 This week: *${fmt(week.thisWeekTotal)}*\n` +
      weekCompareLine +
      `\n📅 *This month so far:* ${fmt(week.thisMonthTotal)}\n` +
      budgetLine + incomeLine +
      `\n📂 *Category Breakdown:*\n\`\`\`\n${categoryLines}\n\`\`\`\n` +
      biggestLine + heaviestLine + tipLine;
    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  private async handleInvestmentFlow(chatId: number, userId: number, text: string, state: PendingInvestmentState) {
    const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

    if (state.step === 'confirm') {
      const reply = text.trim().toLowerCase();
      if (reply === '1' || reply === 'invest' || reply === 'investment' || reply === 'yes') {
        await this.usersService.setPendingState(userId, { ...state, step: 'choose_type' });
        await this.bot.sendMessage(chatId,
          `📊 What type of investment?\n\n1️⃣ Stock (direct equity)\n2️⃣ ETF\n3️⃣ Mutual Fund / SIP\n4️⃣ Gold\n5️⃣ Fixed Deposit / RD\n6️⃣ PPF / NPS\n7️⃣ Bond\n8️⃣ Crypto\n9️⃣ ULIP / Endowment\n\nReply with a number (1–9)`);
      } else if (reply === '2' || reply === 'expense' || reply === 'no') {
        await this.usersService.clearPendingState(userId);
        const expense = await this.expensesService.create({ amount: state.amount, merchant: state.name, category: 'Others', rawMessage: state.rawMessage, telegramUserId: userId });
        await this.bot.sendMessage(chatId, `✅ Saved as expense!\n\n💰 Amount: ${fmt(expense.amount)}\n🏪 Merchant: ${expense.merchant}\n📂 Category: Others`);
        await this.checkBudgetAlert(chatId, userId);
      } else {
        await this.bot.sendMessage(chatId, `Please reply:\n1️⃣ Investment\n2️⃣ Expense`);
      }
      return;
    }

    if (state.step === 'choose_type') {
      const reply = text.trim();
      // Types 1 (Stock) and 2 (ETF) need quantity + price — go to stock_details step
      if (reply === '1' || reply === '2') {
        const type = reply === '1' ? 'Stock' : 'ETF';
        await this.usersService.setPendingState(userId, { ...state, step: 'stock_details', type });
        await this.bot.sendMessage(chatId, `📈 Share the avg price per unit and how many units — in one message.\n\nExample: \`120 5\` means ₹120/unit, 5 units bought`, { parse_mode: 'Markdown' });
        return;
      }
      // All other types — just save with the amount directly
      const typeMap: Record<string, string> = {
        '3': 'Mutual Fund',
        '4': 'Gold',
        '5': 'Fixed Deposit',
        '6': 'PPF/NPS',
        '7': 'Bond',
        '8': 'Crypto',
        '9': 'ULIP/Endowment',
      };
      const typeEmojis: Record<string, string> = {
        'Mutual Fund': '🔄', 'Gold': '🥇', 'Fixed Deposit': '🔒',
        'PPF/NPS': '🏛️', 'Bond': '📜', 'Crypto': '₿', 'ULIP/Endowment': '🛡️',
      };
      const chosenType = typeMap[reply];
      if (chosenType) {
        await this.usersService.clearPendingState(userId);
        const investment = await this.investmentsService.create({ amount: state.amount, type: chosenType, name: state.name, telegramUserId: userId, rawMessage: state.rawMessage });
        const emoji = typeEmojis[chosenType] ?? '💰';
        await this.bot.sendMessage(chatId, `✅ Investment logged!\n\n${emoji} Type: ${chosenType}\n🏦 Name: ${investment.name}\n💰 Amount: ${fmt(investment.amount)}\n\nCheck your investments page 📱`);
      } else {
        await this.bot.sendMessage(chatId, `Please reply with a number 1–9:\n\n1️⃣ Stock  2️⃣ ETF  3️⃣ Mutual Fund\n4️⃣ Gold  5️⃣ Fixed Deposit  6️⃣ PPF/NPS\n7️⃣ Bond  8️⃣ Crypto  9️⃣ ULIP/Endowment`);
      }
      return;
    }

    if (state.step === 'stock_details') {
      const val = parseFloat(text.trim().split(/\s+/)[0]);
      let avgPrice: number;
      let quantity: number;

      if (state.knownQuantity) {
        // We asked only for price — user replies a single number
        avgPrice = val;
        quantity = state.knownQuantity;
        if (isNaN(avgPrice) || avgPrice <= 0) {
          await this.bot.sendMessage(chatId, `❌ Just enter the price per unit. Example: \`165\``, { parse_mode: 'Markdown' });
          return;
        }
      } else {
        // Neither known (or price was ambiguous) — user replies "price qty" format
        const parts = text.trim().split(/\s+/);
        avgPrice = parseFloat(parts[0]);
        quantity = parseFloat(parts[1]);
        if (isNaN(avgPrice) || isNaN(quantity) || avgPrice <= 0 || quantity <= 0) {
          await this.bot.sendMessage(chatId, `❌ Reply with avg price and quantity.\n\nExample: \`165 10\` (₹165 per unit, 10 units)`, { parse_mode: 'Markdown' });
          return;
        }
      }

      const totalAmount = Math.round(avgPrice * quantity);
      await this.usersService.clearPendingState(userId);
      const investment = await this.investmentsService.create({ amount: totalAmount, type: state.type ?? 'Stock', name: state.name, quantity, avgPrice, telegramUserId: userId, rawMessage: state.rawMessage });
      await this.bot.sendMessage(chatId, `✅ Investment logged!\n\n📈 Stock: ${investment.name}\n🔢 ${quantity} units × ${fmt(avgPrice)} avg\n💰 Total: ${fmt(investment.amount)}\n\nCheck your investments page 📱`);
      return;
    }
  }

  // Detect messages that are just brokerage platform top-ups/deposits (not actual investment purchases)
  // e.g. "2000 for zerodha", "500 to groww", "100 on digi gold" — these are wallet transfers, not stock/MF buys
  private isPlatformTransfer(text: string): boolean {
    const lower = text.toLowerCase();

    // Use word-boundary regex so "grow" matches Groww but not "growing" or "growth"
    const platformPatterns = [
      /\bzerodha\b/,
      /\bgroww?\b/,        // matches both "grow" and "groww"
      /\bkuvera\b/,
      /\bdhan\b/,
      /\bupstox\b/,
      /\b5paisa\b/,
      /\bpaytm\s*money\b/,
      /\bicicidirect\b/,
      /\bsmallcase\b/,
      /\bdigi\s*gold\b/,
      /\bdigital\s*gold\b/,
      /\bcoin\s*by\s*zerodha\b/,
    ];
    const mentionsPlatform = platformPatterns.some(p => p.test(lower));
    if (!mentionsPlatform) return false;

    // If the message also mentions a specific instrument, it's a real buy — let it through
    // e.g. "bought Nifty ETF on Zerodha" should NOT be blocked
    const instrumentKeywords = ['stock', 'share', 'sip', 'mutual fund', ' mf ', ' etf', 'bond', 'nifty', 'sensex', 'ipo', 'bought', 'buy', 'purchase'];
    const hasInstrument = instrumentKeywords.some(kw => lower.includes(kw));
    return !hasInstrument;
  }

  onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN')!;
    const webhookUrl = this.configService.get<string>('TELEGRAM_WEBHOOK_URL');

    if (webhookUrl) {
      // Production — webhook mode, no local server (Vercel handles incoming requests)
      this.bot = new TelegramBot(token, { polling: false });
      this.bot.setWebHook(`${webhookUrl}/telegram/webhook`);
      this.logger.log(`Telegram bot webhook set → ${webhookUrl}/telegram/webhook`);
    } else {
      // Local development — use polling
      this.bot = new TelegramBot(token, { polling: true });
      this.logger.log('Telegram bot started (polling)');
    }

    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;
      const userId = msg.from?.id;
      if (!text) return;

      if (text.startsWith('/')) {
        if (text === '/start') {
          await this.bot.sendMessage(chatId,
            `👋 Welcome to RupeePilot!\n\nJust send me a message like:\n• "Spent 450 at Zomato"\n• "Paid 1200 electricity"\n\n📊 *For investments:*\n• "SIP 5000"\n• "Invested 10000 in Zerodha"\n• "Bought Tata Motors shares"\n\nTo connect your web dashboard, click "Link Telegram" there and type the code here.`,
            { parse_mode: 'Markdown' });
        }
        if (text.startsWith('/link ')) {
          const code = text.split(' ')[1]?.trim().toUpperCase();
          if (!code) { await this.bot.sendMessage(chatId, '❌ Please type the code like this: /link XK7P2M'); return; }
          const user = await this.usersService.linkByCode(code, msg.from!.id);
          if (!user) {
            await this.bot.sendMessage(chatId, '❌ Code not found or already used. Go to the dashboard and generate a new code.');
          } else {
            await this.bot.sendMessage(chatId, '✅ Telegram linked to your RupeePilot account!\n\nEvery expense or investment you send here will appear on your dashboard.');
          }
        }
        return;
      }

      if (userId) {
        const state = await this.usersService.getPendingState(userId);
        if (state) {
          await this.handleInvestmentFlow(chatId, userId, text, state);
          return;
        }
      }

      // Reject platform transfers before even calling AI
      if (this.isPlatformTransfer(text)) {
        await this.bot.sendMessage(chatId,
          `ℹ️ We're not counting this as an expense or investment.\n\nPlatform transfers (Zerodha/Groww/Kuvera top-ups) are just wallet moves — no actual asset was bought yet.\n\n📲 Let me know once you *buy* an actual stock, ETF, or mutual fund — I'll log that for you!`,
          { parse_mode: 'Markdown' });
        return;
      }

      try {
        await this.bot.sendMessage(chatId, '⏳ Parsing...');
        const parsed = await this.aiService.parseExpense(text);

        if (parsed.category === 'Investment') {
          if (!userId) return;
          const qty = parsed.quantity ?? 0;
          const price = parsed.pricePerUnit ?? 0;
          const itype = parsed.investmentType ?? 'Unknown';
          const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

          // ── Stock or ETF ──────────────────────────────────────────────────────────
          if (itype === 'Stock' || itype === 'ETF') {
            // All info present → save directly
            if (qty > 0 && price > 0) {
              const totalAmount = Math.round(qty * price);
              const investment = await this.investmentsService.create({ amount: totalAmount, type: itype, name: parsed.merchant, quantity: qty, avgPrice: price, telegramUserId: userId, rawMessage: text });
              await this.bot.sendMessage(chatId, `✅ Investment logged!\n\n📈 ${itype}: ${investment.name}\n🔢 ${qty} units × ${fmt(price)} avg\n💰 Total: ${fmt(investment.amount)}\n\nCheck your investments page 📱`);
              return;
            }
            // Qty known, price missing → ask only price
            if (qty > 0 && price === 0) {
              await this.usersService.setPendingState(userId, { step: 'stock_details', amount: 0, name: parsed.merchant, rawMessage: text, type: itype, knownQuantity: qty });
              await this.bot.sendMessage(chatId, `📈 Got *${qty} units of ${parsed.merchant}*.\n\nWhat was the avg price per unit?\n\nExample: \`165\``, { parse_mode: 'Markdown' });
              return;
            }
            // Price known, qty missing → ask both
            if (price > 0 && qty === 0) {
              await this.usersService.setPendingState(userId, { step: 'stock_details', amount: 0, name: parsed.merchant, rawMessage: text, type: itype });
              await this.bot.sendMessage(chatId, `📈 Got *${parsed.merchant}* — ${fmt(price)} mentioned.\n\nShare *avg price per unit* and *number of units* together.\n\nExample: \`165 10\``, { parse_mode: 'Markdown' });
              return;
            }
            // Neither → go straight to stock_details step (we already know it's a stock/ETF)
            await this.usersService.setPendingState(userId, { step: 'stock_details', amount: 0, name: parsed.merchant, rawMessage: text, type: itype });
            await this.bot.sendMessage(chatId, `📈 Got *${parsed.merchant}* (${itype}).\n\nShare *avg price per unit* and *number of units* in one message.\n\nExample: \`150 10\` means ₹150/unit, 10 units`, { parse_mode: 'Markdown' });
            return;
          }

          // ── Non-stock types the AI identified confidently → save directly ─────────
          const knownTypes = ['Mutual Fund', 'Gold', 'Fixed Deposit', 'PPF/NPS', 'Bond', 'Crypto', 'ULIP/Endowment'];
          if (knownTypes.includes(itype)) {
            const investment = await this.investmentsService.create({ amount: parsed.amount, type: itype, name: parsed.merchant, telegramUserId: userId, rawMessage: text });
            const typeEmojis: Record<string, string> = { 'Mutual Fund': '🔄', 'Gold': '🥇', 'Fixed Deposit': '🔒', 'PPF/NPS': '🏛️', 'Bond': '📜', 'Crypto': '₿', 'ULIP/Endowment': '🛡️' };
            const emoji = typeEmojis[itype] ?? '💰';
            await this.bot.sendMessage(chatId, `✅ Investment logged!\n\n${emoji} Type: ${itype}\n🏦 Name: ${investment.name}\n💰 Amount: ${fmt(investment.amount)}\n\nCheck your investments page 📱`);
            return;
          }

          // ── Unknown type → confirm investment vs expense, then choose type ─────────
          await this.usersService.setPendingState(userId, { step: 'confirm', amount: parsed.amount, name: parsed.merchant, rawMessage: text });
          const amountLine = parsed.amount > 0 ? fmt(parsed.amount) : 'amount not detected';
          await this.bot.sendMessage(chatId,
            `💡 This looks like an investment.\n\n📌 *${parsed.merchant}* — ${amountLine}\n\nIs this an investment or an expense?\n\n1️⃣ Investment\n2️⃣ Expense`,
            { parse_mode: 'Markdown' });
          return;
        }

        const expense = await this.expensesService.create({ amount: parsed.amount, merchant: parsed.merchant, category: parsed.category, rawMessage: text, telegramUserId: userId });
        await this.bot.sendMessage(chatId, `✅ Saved!\n\n💰 Amount: ₹${expense.amount.toLocaleString('en-IN')}\n🏪 Merchant: ${expense.merchant}\n📂 Category: ${expense.category}`);
        if (userId) await this.checkBudgetAlert(chatId, userId);
      } catch (err) {
        this.logger.error('Failed to parse message', err);
        await this.bot.sendMessage(chatId, '❌ Sorry, I couldn\'t understand that. Try something like:\n"Spent 450 at Zomato"');
      }
    });
  }

  // Called by TelegramController to forward webhook updates to the bot
  processUpdate(update: any) {
    this.bot.processUpdate(update);
  }
}
