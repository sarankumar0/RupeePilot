import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ExpensesModule } from '../expenses/expenses.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [ExpensesModule, AiModule],
  providers: [TelegramService],
})
export class TelegramModule {}
