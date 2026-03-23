import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ExpensesModule } from '../expenses/expenses.module';
import { AiModule } from '../ai/ai.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ExpensesModule, AiModule, UsersModule],
  providers: [TelegramService],
})
export class TelegramModule {}
