import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LoanEntryDocument = LoanEntry & Document;

// An append-only transaction against a Loan. Balances are always recomputed from
// these entries — never stored on the Loan — so the ledger can't drift.
// Phase 1 uses only 'repayment'; 'interest' arrives in Phase 2.
@Schema({ timestamps: true })
export class LoanEntry {
  @Prop({ type: Types.ObjectId, ref: 'Loan', required: true, index: true })
  loanId: Types.ObjectId;

  // Denormalized owner for fast per-user queries
  @Prop({ required: true })
  telegramUserId: number;

  @Prop({ required: true, enum: ['repayment', 'interest'] })
  type: 'repayment' | 'interest';

  @Prop({ required: true })
  amount: number;

  @Prop({ default: Date.now })
  date: Date;

  @Prop()
  note?: string;
}

export const LoanEntrySchema = SchemaFactory.createForClass(LoanEntry);
