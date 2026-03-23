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
}

export const UserSchema = SchemaFactory.createForClass(User);
