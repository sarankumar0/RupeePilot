import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expense, ExpenseDocument } from './expense.schema';

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
  async getWeekSummary(telegramUserId: number) {
    const now = new Date();

    // Find the most recent Sunday (start of this week Sun–Sat)
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - dayOfWeek);
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

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
  // - total spent this calendar month
  // - all-time total and expense count
  // - top spending category
  // - breakdown of total spent per category (for the chart)
  async getSummary(telegramUserId: number) {
    // Get the first day of the current month at midnight
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all expenses for this user
    const all = await this.expenseModel.find({ telegramUserId }).exec();

    // Filter only expenses from this month
    const thisMonthExpenses = all.filter((e) => new Date(e.date) >= startOfMonth);

    // Add up totals
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

    // The category with the highest spend
    const topCategory = byCategory[0]?.category ?? '—';

    return {
      thisMonthTotal,
      allTimeTotal,
      totalCount: all.length,
      topCategory,
      byCategory,
    };
  }
}
