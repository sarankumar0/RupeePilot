import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Called by Next.js after Google login — saves user to MongoDB
  @Post('sync')
  async sync(
    @Body() body: { googleId: string; email: string; name: string; avatar: string },
  ) {
    const user = await this.usersService.findOrCreate(body);
    return { user };
  }

  // Get user profile by Google ID
  @Get(':googleId')
  async getUser(@Param('googleId') googleId: string) {
    const user = await this.usersService.findByGoogleId(googleId);
    return { user };
  }

  // Link Telegram ID to a Google account
  @Post(':googleId/link-telegram')
  async linkTelegram(
    @Param('googleId') googleId: string,
    @Body() body: { telegramUserId: number },
  ) {
    const user = await this.usersService.linkTelegram(googleId, body.telegramUserId);
    return { user };
  }

  // Generate a one-time code that the user will type in Telegram to link their account
  // e.g. POST /users/108234.../generate-link-code → returns { code: "XK7P2M" }
  @Post(':googleId/generate-link-code')
  async generateLinkCode(@Param('googleId') googleId: string) {
    const code = await this.usersService.generateLinkCode(googleId);
    return { code };
  }

  // Set monthly budget for a user
  // e.g. POST /users/108234.../budget  body: { monthlyBudget: 10000 }
  @Post(':googleId/budget')
  async setBudget(
    @Param('googleId') googleId: string,
    @Body() body: { monthlyBudget: number },
  ) {
    const user = await this.usersService.setBudget(googleId, body.monthlyBudget);
    return { user };
  }

  // Set monthly income for a user
  // e.g. POST /users/108234.../income  body: { monthlyIncome: 40000 }
  @Post(':googleId/income')
  async setIncome(
    @Param('googleId') googleId: string,
    @Body() body: { monthlyIncome: number },
  ) {
    const user = await this.usersService.setIncome(googleId, body.monthlyIncome);
    return { user };
  }
}
