import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LoanDocument = Loan & Document;

// One lending/borrowing agreement between the user and a counterparty.
// Direction is from the user's perspective. Every lend/borrow event is its own
// Loan record (see docs/LOANS_ARCHITECTURE.md §4.1) — grouping by person is a
// view concern, not a data concern.
@Schema({ timestamps: true })
export class Loan {
  // Owner — the Telegram user who logged this (bot writes; web reads via googleId→telegramUserId)
  @Prop({ required: true })
  telegramUserId: number;

  // 'lent'    = user gave money out, expects it back (a receivable / asset)
  // 'borrowed'= user took money, owes it back (a liability)
  @Prop({ required: true, enum: ['lent', 'borrowed'] })
  direction: 'lent' | 'borrowed';

  // Display name of the other party — "Ravi K", "HDFC Bank"
  @Prop({ required: true })
  counterpartyName: string;

  // Normalized name (trim + lowercase) — used for grouping and matching repayments
  @Prop({ required: true })
  counterpartyKey: string;

  @Prop({ required: true, enum: ['friend', 'individual', 'institution'], default: 'friend' })
  counterpartyType: 'friend' | 'individual' | 'institution';

  // Original amount of this loan
  @Prop({ required: true })
  principal: number;

  // Interest terms. Phase 1 is interest-free, so these default to none/0.
  @Prop({ enum: ['none', 'flat_monthly', 'percent_monthly', 'percent_annual'], default: 'none' })
  interestType: 'none' | 'flat_monthly' | 'percent_monthly' | 'percent_annual';

  @Prop({ default: 0 })
  interestRate: number;

  @Prop({ default: Date.now })
  startDate: Date;

  // Optional expected-return date (lump sum) or EMI end date
  @Prop()
  dueDate?: Date;

  @Prop({ enum: ['active', 'closed'], default: 'active' })
  status: 'active' | 'closed';

  @Prop()
  note?: string;

  // The original message the user typed (for auditing)
  @Prop()
  rawMessage?: string;
}

export const LoanSchema = SchemaFactory.createForClass(Loan);
