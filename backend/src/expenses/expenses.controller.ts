import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { AiService } from '../ai/ai.service';

// @Controller('expenses') means all routes here start with /expenses
@Controller('expenses')
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly aiService: AiService,
  ) {}

  // POST /expenses
  // User sends a JSON body like: { amount: 450, merchant: "Zomato", category: "Food", rawMessage: "Spent ₹450 Zomato" }
  // @Body() reads the JSON body from the request
  @Post()
  async create(
    @Body()
    body: {
      amount: number;
      merchant: string;
      category: string;
      rawMessage: string;
    },
  ) {
    const saved = await this.expensesService.create(body);
    return {
      message: 'Expense saved successfully',
      expense: saved,
    };
  }

  // POST /expenses/parse
  // User sends a raw message like: { "text": "Spent 450 at Zomato" }
  // AI extracts amount, merchant, category — then auto-saves to MongoDB
  @Post('parse')
  async parse(@Body() body: { text: string }) {
    try {
      const parsed = await this.aiService.parseExpense(body.text);
      const saved = await this.expensesService.create({
        ...parsed,
        rawMessage: body.text,
      });
      return {
        message: 'Expense parsed and saved',
        parsed,
        expense: saved,
      };
    } catch (error) {
      console.error('Parse error:', error.message);
      throw error;
    }
  }

  // GET /expenses
  // If ?telegramUserId=xxx is passed → returns only that user's expenses
  // Otherwise → returns all expenses
  @Get()
  async findAll(@Query('telegramUserId') telegramUserId?: string) {
    if (telegramUserId) {
      const expenses = await this.expensesService.findByUser(Number(telegramUserId));
      return { count: expenses.length, expenses };
    }
    const expenses = await this.expensesService.findAll();
    return { count: expenses.length, expenses };
  }

  // GET /expenses/summary?telegramUserId=xxx
  // Returns stats for the dashboard: monthly total, all-time total, category breakdown
  @Get('summary')
  async getSummary(@Query('telegramUserId') telegramUserId: string) {
    const summary = await this.expensesService.getSummary(Number(telegramUserId));
    return summary;
  }
}
