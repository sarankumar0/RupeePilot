import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { InvestmentsService } from './investments.service';

@Controller('investments')
export class InvestmentsController {
  constructor(private investmentsService: InvestmentsService) {}

  @Post()
  async create(
    @Body()
    body: {
      amount: number;
      type: string;
      name: string;
      quantity?: number;
      avgPrice?: number;
      telegramUserId?: number;
      rawMessage?: string;
    },
  ) {
    const investment = await this.investmentsService.create(body);
    return { investment };
  }

  @Get()
  async findAll(@Query('telegramUserId') telegramUserId: string) {
    if (!telegramUserId) return [];
    return this.investmentsService.findByUser(Number(telegramUserId));
  }

  // Returns this month summary + all-time total for the investments dashboard page
  // salaryDate is optional — defaults to 1 (calendar month) if not provided
  @Get('summary')
  async getSummary(
    @Query('telegramUserId') telegramUserId: string,
    @Query('salaryDate') salaryDate?: string,
  ) {
    if (!telegramUserId) {
      return { thisMonthTotal: 0, allTimeTotal: 0, byType: [], investments: [] };
    }
    const monthly = await this.investmentsService.getThisMonthSummary(
      Number(telegramUserId),
      salaryDate ? Number(salaryDate) : 1,
    );
    const allTime = await this.investmentsService.getAllTimeSummary(Number(telegramUserId));
    return { ...monthly, allTimeTotal: allTime.allTimeTotal };
  }
}
