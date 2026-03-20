import { Controller, Get, Post, Body } from '@nestjs/common';
import { ExpensesService } from './expenses.service';

// @Controller('expenses') means all routes here start with /expenses
@Controller('expenses')
export class ExpensesController {
  // NestJS automatically injects ExpensesService here
  constructor(private readonly expensesService: ExpensesService) {}

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

  // GET /expenses
  // Returns all saved expenses as a JSON array
  @Get()
  async findAll() {
    const expenses = await this.expensesService.findAll();
    return {
      count: expenses.length,
      expenses,
    };
  }
}
