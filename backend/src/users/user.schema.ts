import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  // Google's unique ID for this user — never changes
  @Prop({ required: true, unique: true })
  googleId: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  name: string;

  @Prop()
  avatar: string;

  // Telegram user ID — user links this after logging in
  @Prop()
  telegramUserId: number;

  // Temporary code used to link Telegram from the dashboard (cleared after linking)
  @Prop()
  linkCode: string;

  // Monthly spending budget set by the user — e.g. 10000 means ₹10,000/month
  @Prop({ default: 0 })
  monthlyBudget: number;

  // Monthly income — used in weekly reports to show % of salary spent
  @Prop({ default: 0 })
  monthlyIncome: number;

  // Day of the month the user gets their salary (1–31)
  // Used to define expense "months" based on pay cycle instead of calendar month
  @Prop({ default: 1 })
  salaryDate: number;

  // Set to true after the user completes the onboarding wizard
  @Prop({ default: false })
  onboardingDone: boolean;

  // Target % of monthly income the user wants to invest — e.g. 20 means 20%
  @Prop({ default: 20 })
  investmentGoalPercent: number;

  // Stores the current step of a multi-step investment conversation in the Telegram bot.
  // Saved to MongoDB so the flow survives bot restarts.
  // Cleared (set to null) once the conversation finishes or the investment is saved.
  @Prop({ type: Object, default: null })
  pendingInvestmentState: {
    step: 'confirm' | 'choose_type' | 'stock_details';
    amount: number;
    name: string;
    rawMessage: string;
    type?: string;
    knownQuantity?: number;
  } | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
