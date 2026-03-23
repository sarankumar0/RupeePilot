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
