import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InvestmentsService } from './investments.service';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';

// Read-only endpoints for the investments dashboard. Investments are written by
// the Telegram bot in-process (InvestmentsService), never over HTTP. The caller's
// telegramUserId is resolved from their authenticated googleId.
@Controller('investments')
@UseGuards(AuthGuard)
export class InvestmentsController {
  constructor(
    private investmentsService: InvestmentsService,
    private usersService: UsersService,
  ) {}

  private async resolveTelegramId(googleId: string): Promise<number | null> {
    const user = await this.usersService.findByGoogleId(googleId);
    return user?.telegramUserId ?? null;
  }

  @Get('me')
  async findMine(@CurrentUser() user: AuthUser) {
    const telegramUserId = await this.resolveTelegramId(user.googleId);
    if (!telegramUserId) return [];
    return this.investmentsService.findByUser(telegramUserId);
  }

  // Returns this-month summary + all-time total for the investments dashboard page
  @Get('summary/me')
  async getSummaryMine(
    @CurrentUser() user: AuthUser,
    @Query('salaryDate') salaryDate?: string,
  ) {
    const telegramUserId = await this.resolveTelegramId(user.googleId);
    if (!telegramUserId) {
      return { thisMonthTotal: 0, allTimeTotal: 0, byType: [], investments: [] };
    }
    const monthly = await this.investmentsService.getThisMonthSummary(
      telegramUserId,
      salaryDate ? Number(salaryDate) : 1,
    );
    const allTime = await this.investmentsService.getAllTimeSummary(telegramUserId);
    return { ...monthly, allTimeTotal: allTime.allTimeTotal };
  }
}
