import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';

// Read-only endpoints for the dashboard. Expenses are written by the Telegram
// bot in-process (ExpensesService), never over HTTP, so there is no public
// create endpoint to abuse. The caller's telegramUserId is resolved from their
// authenticated googleId — never accepted as a query param.
@Controller('expenses')
@UseGuards(AuthGuard)
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly usersService: UsersService,
  ) {}

  private async resolveTelegramId(googleId: string): Promise<number | null> {
    const user = await this.usersService.findByGoogleId(googleId);
    return user?.telegramUserId ?? null;
  }

  // GET /expenses/me — the current user's expenses
  @Get('me')
  async findMine(@CurrentUser() user: AuthUser) {
    const telegramUserId = await this.resolveTelegramId(user.googleId);
    if (!telegramUserId) return { count: 0, expenses: [] };
    const expenses = await this.expensesService.findByUser(telegramUserId);
    return { count: expenses.length, expenses };
  }

  // GET /expenses/summary/me?salaryDate=15 — dashboard stats for the current user
  @Get('summary/me')
  async getSummaryMine(
    @CurrentUser() user: AuthUser,
    @Query('salaryDate') salaryDate?: string,
  ) {
    const telegramUserId = await this.resolveTelegramId(user.googleId);
    if (!telegramUserId) {
      return {
        thisMonthTotal: 0,
        thisMonthInvested: 0,
        allTimeTotal: 0,
        totalCount: 0,
        topCategory: '—',
        byCategory: [],
      };
    }
    return this.expensesService.getSummary(
      telegramUserId,
      salaryDate ? Number(salaryDate) : 1,
    );
  }
}
