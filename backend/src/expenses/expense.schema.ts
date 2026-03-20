import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// This tells TypeScript: an ExpenseDocument is an Expense + MongoDB's built-in fields (_id, __v etc.)
export type ExpenseDocument = Expense & Document;

// @Schema() tells Mongoose: this class represents a MongoDB collection
// timestamps: true → MongoDB will auto-add createdAt and updatedAt fields
@Schema({ timestamps: true })
export class Expense {
  // @Prop() marks each field that should be saved in MongoDB

  // The amount spent — e.g. 450
  @Prop({ required: true })
  amount: number;

  // Where the money was spent — e.g. "Zomato"
  @Prop({ required: true })
  merchant: string;

  // Category auto-detected by AI — e.g. "Food"
  @Prop({ required: true })
  category: string;

  // The original message the user typed — e.g. "Spent ₹450 Zomato"
  @Prop({ required: true })
  rawMessage: string;

  // The date of the expense — defaults to right now if not provided
  @Prop({ default: Date.now })
  date: Date;
}

// SchemaFactory converts the class above into an actual Mongoose schema
export const ExpenseSchema = SchemaFactory.createForClass(Expense);
