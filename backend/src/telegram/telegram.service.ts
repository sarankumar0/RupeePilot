import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpensesService } from '../expenses/expenses.service';
import { InvestmentsService } from '../investments/investments.service';
import { AiService } from '../ai/ai.service';
import { UsersService } from '../users/users.service';
import { LoansService } from '../loans/loans.service';
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

// A loan-related message the user typed, once parsed
type LoanIntent =
  | { kind: 'create'; direction: 'lent' | 'borrowed'; amount: number; name: string }
  | { kind: 'repay'; direction: 'lent' | 'borrowed'; amount: number; name: string }
  | { kind: 'query'; person?: string };

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
    private loansService: LoansService,
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

  // Detects loan messages (lend / borrow / repay / summary query). Returns null
  // for anything that isn't clearly about lending — so normal expenses fall through.
  private parseLoanIntent(text: string): LoanIntent | null {
    const t = text.trim();
    const lower = t.toLowerCase();
    const num = (s: string) => parseInt(s.replace(/[^\d]/g, ''), 10);

    // ── Queries ──
    if (/\bwho (?:all )?owes me\b/.test(lower) || /\bwho do i owe\b/.test(lower)) return { kind: 'query' };
    if (/\b(?:loans?|debts?) summary\b/.test(lower) || /\bmy loans\b/.test(lower) || /\bshow (?:my )?loans\b/.test(lower)) return { kind: 'query' };
    let m = lower.match(/how much (?:does|do)\s+(.+?)\s+owes?\s+me\b/);
    if (m) return { kind: 'query', person: m[1] };
    m = lower.match(/how much do i owe\s+(.+?)[\s?.!]*$/);
    if (m) return { kind: 'query', person: m[1] };
    if (/\bhow much do i owe\b/.test(lower) || /\bhow much am i owed\b/.test(lower)) return { kind: 'query' };

    // ── Repayments (require an explicit back/returned/repaid signal) ──
    // Someone paid the user back → repayment on a 'lent' loan
    m = t.match(/^(.+?)\s+(?:paid back|returned|repaid|gave back|settled)\s+(?:₹|rs\.?)?\s*([\d,]+)/i);
    if (m && m[1].trim().toLowerCase() !== 'i') return { kind: 'repay', direction: 'lent', amount: num(m[2]), name: m[1] };
    m = lower.match(/got\s+(?:₹|rs\.?)?\s*([\d,]+)\s+back from\s+(.+)/);
    if (m) return { kind: 'repay', direction: 'lent', amount: num(m[1]), name: m[2] };
    // The user paid someone back → repayment on a 'borrowed' loan
    m = t.match(/(?:paid back|repaid|returned)\s+(?:₹|rs\.?)?\s*([\d,]+)\s+to\s+(.+)/i);
    if (m) return { kind: 'repay', direction: 'borrowed', amount: num(m[1]), name: m[2] };
    m = t.match(/paid\s+(?:₹|rs\.?)?\s*([\d,]+)\s+back to\s+(.+)/i);
    if (m) return { kind: 'repay', direction: 'borrowed', amount: num(m[1]), name: m[2] };

    // ── Create ──
    m = t.match(/\b(?:lent|loaned|lend)\b\s+(?:₹|rs\.?)?\s*([\d,]+)\s+to\s+(.+)/i);
    if (m) return { kind: 'create', direction: 'lent', amount: num(m[1]), name: m[2] };
    m = t.match(/\b(?:gave|give)\b\s+(?:₹|rs\.?)?\s*([\d,]+)\s+to\s+(.+)/i);
    if (m && /\bloan\b/i.test(t)) return { kind: 'create', direction: 'lent', amount: num(m[1]), name: m[2] };
    m = t.match(/\b(?:borrowed|borrow|took)\b\s+(?:₹|rs\.?)?\s*([\d,]+)\s+(?:loan\s+)?from\s+(.+)/i);
    if (m) return { kind: 'create', direction: 'borrowed', amount: num(m[1]), name: m[2] };

    return null;
  }

  // Trim a captured counterparty down to a clean display name
  private cleanCounterparty(raw: string): string {
    let n = raw.trim();
    n = n.split(/\s+(?:for|because|since|as|via|through|on|yesterday|today)\b/i)[0];
    n = n.replace(/[.?!,;:]+$/, '').trim();
    n = n.split(/\s+/).slice(0, 3).join(' ');
    return n.split(' ').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
  }

  private async handleLoanIntent(chatId: number, userId: number, intent: LoanIntent, rawText: string) {
    const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

    if (intent.kind === 'query') {
      const s = await this.loansService.getSummary(userId);
      if (intent.person) {
        const key = intent.person.trim().toLowerCase();
        const p = s.people.find((x) => x.key === key || x.name.toLowerCase().startsWith(key));
        if (!p) {
          await this.bot.sendMessage(chatId, `No active loans with *${this.cleanCounterparty(intent.person)}*.`, { parse_mode: 'Markdown' });
          return;
        }
        let msg = `📒 *${p.name}*`;
        if (p.lent > 0) msg += `\n➡️ Owes you: *${fmt(p.lent)}*`;
        if (p.borrowed > 0) msg += `\n⬅️ You owe: *${fmt(p.borrowed)}*`;
        msg += `\n\n${p.netToYou >= 0 ? `Net: ${p.name} owes you *${fmt(p.netToYou)}*` : `Net: you owe ${p.name} *${fmt(-p.netToYou)}*`}`;
        await this.bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
        return;
      }
      if (s.totalReceivable === 0 && s.totalPayable === 0) {
        await this.bot.sendMessage(chatId, `You have no active loans logged.\n\nTry: "Lent 5000 to Ravi" or "Borrowed 2000 from Kumar".`);
        return;
      }
      let msg = `📒 *Loans Summary*\n\n💰 Owed to you: *${fmt(s.totalReceivable)}*\n💸 You owe: *${fmt(s.totalPayable)}*\n📊 Net: *${s.net >= 0 ? fmt(s.net) : '-' + fmt(-s.net)}*`;
      const active = s.people.filter((p) => p.lent > 0 || p.borrowed > 0);
      if (active.length) {
        msg += `\n\n*People:*`;
        for (const p of active) {
          if (p.netToYou > 0) msg += `\n• ${p.name} owes you ${fmt(p.netToYou)}`;
          else if (p.netToYou < 0) msg += `\n• You owe ${p.name} ${fmt(-p.netToYou)}`;
        }
      }
      await this.bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
      return;
    }

    const name = this.cleanCounterparty(intent.name);
    if (!name) {
      await this.bot.sendMessage(chatId, `Who is this loan with? Try: "Lent 5000 to Ravi".`);
      return;
    }

    if (intent.kind === 'create') {
      await this.loansService.createLoan({
        telegramUserId: userId,
        direction: intent.direction,
        counterpartyName: name,
        principal: intent.amount,
        rawMessage: rawText,
      });
      if (intent.direction === 'lent') {
        await this.bot.sendMessage(chatId, `🤝 Logged — you *lent ${fmt(intent.amount)}* to ${name}.\nThey owe you ${fmt(intent.amount)}.\n\nWhen they repay, say "${name} paid back 500".`, { parse_mode: 'Markdown' });
      } else {
        await this.bot.sendMessage(chatId, `🤝 Logged — you *borrowed ${fmt(intent.amount)}* from ${name}.\nYou owe ${fmt(intent.amount)}.\n\nWhen you repay, say "paid back 500 to ${name}".`, { parse_mode: 'Markdown' });
      }
      return;
    }

    // repay
    const res = await this.loansService.applyRepayment(userId, name, intent.direction, intent.amount);
    if (!res.matched) {
      const hint = intent.direction === 'lent' ? `lent 1000 to ${name}` : `borrowed 1000 from ${name}`;
      await this.bot.sendMessage(chatId, `🤔 I couldn't find an active loan ${intent.direction === 'lent' ? `you lent to ${name}` : `you borrowed from ${name}`}.\n\nLog it first: "${hint}".`);
      return;
    }
    let msg = intent.direction === 'lent'
      ? `✅ ${res.counterpartyName} repaid ${fmt(res.applied)}.`
      : `✅ You repaid ${fmt(res.applied)} to ${res.counterpartyName}.`;
    if (res.closed > 0) msg += `\n🎉 ${res.closed} loan${res.closed > 1 ? 's' : ''} fully settled!`;
    if (res.leftover > 0) msg += `\n(${fmt(res.leftover)} was more than owed — not applied.)`;
    await this.bot.sendMessage(chatId, msg);
  }

  onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN')!;
    const webhookUrl = this.configService.get<string>('TELEGRAM_WEBHOOK_URL');
    const webhookSecret = this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET');

    if (webhookUrl) {
      // Production — webhook mode. Telegram POSTs updates to /telegram/webhook,
      // which the controller forwards to handleUpdate() and AWAITS. We deliberately
      // do NOT register an 'on message' listener here: on serverless its async
      // replies would run fire-and-forget and get killed the moment the function
      // returns 200 — so the bot would go silent even though Telegram sees success.
      this.bot = new TelegramBot(token, { polling: false });
      // When a secret is configured, Telegram echoes it back in the
      // X-Telegram-Bot-Api-Secret-Token header so the controller can reject
      // spoofed requests. Optional so this is safe to deploy before the env is set.
      this.bot.setWebHook(
        `${webhookUrl}/telegram/webhook`,
        webhookSecret ? ({ secret_token: webhookSecret } as any) : undefined,
      );
      this.logger.log(`Telegram bot webhook set → ${webhookUrl}/telegram/webhook`);
    } else {
      // Local development — use polling. The process stays alive, so awaiting
      // inside the listener completes normally.
      this.bot = new TelegramBot(token, { polling: true });
      this.logger.log('Telegram bot started (polling)');
      this.bot.on('message', (msg) => {
        this.handleMessage(msg).catch((err) => this.logger.error('handleMessage failed', err));
      });
    }
  }

  // Entry point for the webhook path — called and awaited by TelegramController
  // so replies finish sending before the serverless function returns.
  async handleUpdate(update: any) {
    if (update?.message) {
      await this.handleMessage(update.message);
    }
  }

  // Processes a single incoming Telegram message (commands, expenses, investments).
  private async handleMessage(msg: TelegramBot.Message) {
      const chatId = msg.chat.id;
      const text = msg.text;
      const userId = msg.from?.id;
      if (!text) return;

      if (text.startsWith('/')) {
        if (text === '/start') {
          await this.bot.sendMessage(chatId,
            `👋 Welcome to RupeePilot!\n\nJust send me a message like:\n• "Spent 450 at Zomato"\n• "Paid 1200 electricity"\n\n📊 *For investments:*\n• "SIP 5000"\n• "Invested 10000 in Zerodha"\n• "Bought Tata Motors shares"\n\n🤝 *For loans:*\n• "Lent 5000 to Ravi"\n• "Borrowed 2000 from Kumar"\n• "Ravi paid back 500"\n• "Who owes me?"\n\nTo connect your web dashboard, click "Link Telegram" there and type the code here.`,
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

      // ── Loans / debts: lend, borrow, repay, or "who owes me" ──
      if (userId) {
        const loanIntent = this.parseLoanIntent(text);
        if (loanIntent) {
          await this.handleLoanIntent(chatId, userId, loanIntent, text);
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
  }
}
