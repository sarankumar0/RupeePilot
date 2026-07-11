import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';

// Every route requires a valid bearer token. The user's googleId comes from the
// verified token (CurrentUser) — never from the URL — so a caller can only ever
// read or modify their own record.
@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Called by Next.js right after Google login (token already minted) — saves the
  // user to MongoDB. googleId is taken from the token; email/name/avatar from body.
  @Post('sync')
  async sync(
    @CurrentUser() user: AuthUser,
    @Body() body: { email: string; name: string; avatar: string },
  ) {
    const saved = await this.usersService.findOrCreate({
      googleId: user.googleId,
      email: body.email,
      name: body.name,
      avatar: body.avatar,
    });
    return { user: saved };
  }

  // Get the current user's profile
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return { user: await this.usersService.findByGoogleId(user.googleId) };
  }

  // Link a Telegram ID to the current account
  @Post('me/link-telegram')
  async linkTelegram(
    @CurrentUser() user: AuthUser,
    @Body() body: { telegramUserId: number },
  ) {
    return { user: await this.usersService.linkTelegram(user.googleId, body.telegramUserId) };
  }

  // Generate a one-time code the user types in Telegram to link their account
  @Post('me/generate-link-code')
  async generateLinkCode(@CurrentUser() user: AuthUser) {
    return { code: await this.usersService.generateLinkCode(user.googleId) };
  }

  // Set monthly budget
  @Post('me/budget')
  async setBudget(
    @CurrentUser() user: AuthUser,
    @Body() body: { monthlyBudget: number },
  ) {
    return { user: await this.usersService.setBudget(user.googleId, body.monthlyBudget) };
  }

  // Set monthly income
  @Post('me/income')
  async setIncome(
    @CurrentUser() user: AuthUser,
    @Body() body: { monthlyIncome: number },
  ) {
    return { user: await this.usersService.setIncome(user.googleId, body.monthlyIncome) };
  }

  // Complete onboarding — income, salary date, budget in one call
  @Post('me/onboarding')
  async completeOnboarding(
    @CurrentUser() user: AuthUser,
    @Body() body: { monthlyIncome: number; salaryDate: number; monthlyBudget: number },
  ) {
    return { user: await this.usersService.completeOnboarding(user.googleId, body) };
  }

  // Set investment goal %
  @Post('me/investment-goal')
  async setInvestmentGoal(
    @CurrentUser() user: AuthUser,
    @Body() body: { investmentGoalPercent: number },
  ) {
    return { user: await this.usersService.setInvestmentGoal(user.googleId, body.investmentGoalPercent) };
  }
}
