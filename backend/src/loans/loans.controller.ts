import { Controller, Get, UseGuards } from '@nestjs/common';
import { LoansService } from './loans.service';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';

// Read-only endpoints for the Loans dashboard. Loans are written by the Telegram
// bot in-process (LoansService), never over HTTP. telegramUserId is resolved from
// the authenticated googleId — never trusted from the client.
@Controller('loans')
@UseGuards(AuthGuard)
export class LoansController {
  constructor(
    private readonly loansService: LoansService,
    private readonly usersService: UsersService,
  ) {}

  private async resolveTelegramId(googleId: string): Promise<number | null> {
    const user = await this.usersService.findByGoogleId(googleId);
    return user?.telegramUserId ?? null;
  }

  @Get('me')
  async findMine(@CurrentUser() user: AuthUser) {
    const telegramUserId = await this.resolveTelegramId(user.googleId);
    if (!telegramUserId) return [];
    return this.loansService.listWithBalances(telegramUserId);
  }

  @Get('me/summary')
  async summaryMine(@CurrentUser() user: AuthUser) {
    const telegramUserId = await this.resolveTelegramId(user.googleId);
    if (!telegramUserId) {
      return { totalReceivable: 0, totalPayable: 0, net: 0, people: [] };
    }
    return this.loansService.getSummary(telegramUserId);
  }
}
