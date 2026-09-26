import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { ExpensesModule } from '../expenses/expenses.module';
import { AiModule } from '../ai/ai.module';
import { UsersModule } from '../users/users.module';
import { InvestmentsModule } from '../investments/investments.module';
import { LoansModule } from '../loans/loans.module';

@Module({
  imports: [ExpensesModule, AiModule, UsersModule, InvestmentsModule, LoansModule],
  controllers: [TelegramController],
  providers: [TelegramService],
})
export class TelegramModule {}
