import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InvestmentDocument = Investment & Document;

@Schema({ timestamps: true })
export class Investment {
  // Total amount invested — e.g. 5000 for "SIP 5000"
  @Prop({ required: true })
  amount: number;

  // Asset class of the investment — one of:
  // Stock | ETF | Mutual Fund | Gold | Fixed Deposit | PPF/NPS | Bond | Crypto | ULIP/Endowment
  @Prop({ required: true })
  type: string;

  // Name of the stock, fund, or instrument — e.g. "Tata Motors", "Parag Parikh Fund"
  @Prop({ required: true })
  name: string;

  // Number of units/shares — only for Stock, ETF, Bond
  @Prop()
  quantity: number;

  // Average buy price per unit — only for Stock, ETF, Bond
  @Prop()
  avgPrice: number;

  // Telegram user ID — identifies who logged this investment
  @Prop()
  telegramUserId: number;

  // The original message the user typed
  @Prop()
  rawMessage: string;

  @Prop({ default: Date.now })
  date: Date;
}

export const InvestmentSchema = SchemaFactory.createForClass(Investment);
