import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Investment, InvestmentDocument } from './investment.schema';

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

@Injectable()
export class InvestmentsService {
  constructor(
    @InjectModel(Investment.name) private investmentModel: Model<InvestmentDocument>,
  ) {}

  async create(data: {
    amount: number;
    type: string;
    name: string;
    quantity?: number;
    avgPrice?: number;
    telegramUserId?: number;
    rawMessage?: string;
  }): Promise<InvestmentDocument> {
    const investment = new this.investmentModel(data);
    return investment.save();
  }

  async findByUser(telegramUserId: number): Promise<InvestmentDocument[]> {
    return this.investmentModel.find({ telegramUserId }).sort({ date: -1 }).exec();
  }

  // salaryDate — the day of month the user gets paid (defaults to 1 = calendar month)
  async getThisMonthSummary(telegramUserId: number, salaryDate: number = 1) {
    const start = getSalaryPeriodStart(salaryDate);

    const investments = await this.investmentModel
      .find({ telegramUserId, date: { $gte: start } })
      .exec();

    const total = investments.reduce((sum, i) => sum + i.amount, 0);

    const byTypeMap: Record<string, number> = {};
    for (const inv of investments) {
      byTypeMap[inv.type] = (byTypeMap[inv.type] || 0) + inv.amount;
    }
    const byType = Object.entries(byTypeMap).map(([type, total]) => ({ type, total }));

    return { thisMonthTotal: total, byType, investments };
  }

  async getAllTimeSummary(telegramUserId: number) {
    const investments = await this.investmentModel.find({ telegramUserId }).exec();
    const total = investments.reduce((sum, i) => sum + i.amount, 0);

    const byTypeMap: Record<string, number> = {};
    for (const inv of investments) {
      byTypeMap[inv.type] = (byTypeMap[inv.type] || 0) + inv.amount;
    }
    const byType = Object.entries(byTypeMap).map(([type, total]) => ({ type, total }));

    return { allTimeTotal: total, byType };
  }
}
