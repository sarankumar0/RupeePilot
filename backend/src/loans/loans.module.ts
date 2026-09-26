import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Loan, LoanSchema } from './loan.schema';
import { LoanEntry, LoanEntrySchema } from './loan-entry.schema';
import { LoansService } from './loans.service';
import { LoansController } from './loans.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Loan.name, schema: LoanSchema },
      { name: LoanEntry.name, schema: LoanEntrySchema },
    ]),
    UsersModule, // for resolving googleId -> telegramUserId in the controller
  ],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService], // used by the Telegram bot
})
export class LoansModule {}
