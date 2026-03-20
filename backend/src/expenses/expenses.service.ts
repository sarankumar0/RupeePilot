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
  }): Promise<ExpenseDocument> {
    const expense = new this.expenseModel(data);
    return expense.save(); // .save() writes it to MongoDB
  }

  // Fetch all expenses from MongoDB, sorted newest first
  async findAll(): Promise<ExpenseDocument[]> {
    return this.expenseModel.find().sort({ createdAt: -1 }).exec();
  }
}
