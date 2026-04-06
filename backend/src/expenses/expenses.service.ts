import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expense, ExpenseDocument } from './expense.schema';

// Returns the start date of the current salary period.
// If the user's salary comes on the 15th:
//   - Today = March 20 → period started March 15
//   - Today = March 10 → period started February 15
// Defaults to the 1st (calendar month) if salaryDate is not set.
function getSalaryPeriodStart(salaryDate: number = 1): Date {
  const now = new Date();
  if (now.getDate() >= salaryDate) {
    return new Date(now.getFullYear(), now.getMonth(), salaryDate, 0, 0, 0, 0);
  } else {
    return new Date(now.getFullYear(), now.getMonth() - 1, salaryDate, 0, 0, 0, 0);
  }
}

// @Injectable() means NestJS will manage this class and inject it wherever needed
@Injectable()
export class ExpensesService {
  // @InjectModel injects the Mongoose model so we can talk to MongoDB
  constructor(
    @InjectModel(Expense.name) private expenseModel: Model<ExpenseDocument>,
  ) {}

  // Save a new expense to MongoDB
  // The 'data' object must have: amount, merchant, category, rawMessage
  async create(data: {
    amount: number;
    merchant: string;
    category: string;
    rawMessage: string;
    telegramUserId?: number;
  }): Promise<ExpenseDocument> {
    const expense = new this.expenseModel(data);
    return expense.save(); // .save() writes it to MongoDB
  }

  // Fetch all expenses from MongoDB, sorted newest first
  async findAll(): Promise<ExpenseDocument[]> {
    return this.expenseModel.find().sort({ createdAt: -1 }).exec();
  }

  // Fetch expenses for a specific Telegram user, newest first
  async findByUser(telegramUserId: number): Promise<ExpenseDocument[]> {
    return this.expenseModel
      .find({ telegramUserId })
      .sort({ createdAt: -1 })
      .exec();
  }

  // Calculate this week's and last week's expense data for the weekly report
  // salaryDate — the day of month the user gets paid (defaults to 1 = calendar month)
  async getWeekSummary(telegramUserId: number, salaryDate: number = 1) {
    const now = new Date();

    // Find the most recent Sunday (start of this week Sun–Sat)
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - dayOfWeek);
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    // Use salary-cycle month start instead of calendar month
    const startOfMonth = getSalaryPeriodStart(salaryDate);

    const all = await this.expenseModel.find({ telegramUserId }).exec();

    const thisWeek = all.filter((e) => new Date(e.date) >= startOfThisWeek);
    const lastWeek = all.filter(
      (e) => new Date(e.date) >= startOfLastWeek && new Date(e.date) < startOfThisWeek,
    );
    const thisMonth = all.filter((e) => new Date(e.date) >= startOfMonth);

    const thisWeekTotal = thisWeek.reduce((s, e) => s + e.amount, 0);
    const lastWeekTotal = lastWeek.reduce((s, e) => s + e.amount, 0);
    const thisMonthTotal = thisMonth.reduce((s, e) => s + e.amount, 0);

    // Category breakdown for this week
    const categoryMap: Record<string, number> = {};
    for (const e of thisWeek) {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    }
    const byCategory = Object.entries(categoryMap)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    // Biggest single expense this week
    const biggestExpense = thisWeek.reduce(
      (max, e) => (e.amount > (max?.amount ?? 0) ? e : max),
      null as (typeof thisWeek)[0] | null,
    );

    // Day with the most spending (0=Sun … 6=Sat)
    const dayTotals: Record<number, number> = {};
    for (const e of thisWeek) {
      const day = new Date(e.date).getDay();
      dayTotals[day] = (dayTotals[day] || 0) + e.amount;
    }
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const heaviestDayNum = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0]?.[0];
    const heaviestDay = heaviestDayNum !== undefined ? dayNames[Number(heaviestDayNum)] : null;

    return {
      thisWeekTotal,
      lastWeekTotal,
      thisMonthTotal,
      byCategory,
      biggestExpense,
      heaviestDay,
    };
  }

  // Calculate summary stats for a user:
  // - total spent this salary period ("this month" starts on salaryDate, not the 1st)
  // - all-time total and expense count
  // - top spending category
  // - breakdown of total spent per category (for the chart)
  // salaryDate — the day of month the user gets paid (defaults to 1 = calendar month)
  async getSummary(telegramUserId: number, salaryDate: number = 1) {
    // Start of the current salary period — e.g. 15th if salary comes on the 15th
    const startOfMonth = getSalaryPeriodStart(salaryDate);

    // Fetch all expenses for this user
    const all = await this.expenseModel.find({ telegramUserId }).exec();

    // Filter only expenses from this month
    const thisMonthExpenses = all.filter((e) => new Date(e.date) >= startOfMonth);

    // Separate investments from regular spending
    const thisMonthInvested = thisMonthExpenses
      .filter((e) => e.category === 'Investment')
      .reduce((sum, e) => sum + e.amount, 0);

    // thisMonthTotal = all spending including investments (for overall awareness)
    const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const allTimeTotal = all.reduce((sum, e) => sum + e.amount, 0);

    // Group by category — builds an object like { Food: 1800, Transport: 600 }
    const categoryMap: Record<string, number> = {};
    for (const expense of all) {
      categoryMap[expense.category] = (categoryMap[expense.category] || 0) + expense.amount;
    }

    // Convert to array sorted by total descending — for the chart
    const byCategory = Object.entries(categoryMap)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    // Top category excluding Investment (Investment is wealth-building, not spending)
    const topCategory =
      byCategory.find((b) => b.category !== 'Investment')?.category ?? '—';

    return {
      thisMonthTotal,
      thisMonthInvested,
      allTimeTotal,
      totalCount: all.length,
      topCategory,
      byCategory,
    };
  }
}
