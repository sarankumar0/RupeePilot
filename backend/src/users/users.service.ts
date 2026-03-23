import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Find user by Google ID, or create them if first login
  async findOrCreate(data: {
    googleId: string;
    email: string;
    name: string;
    avatar: string;
  }): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ googleId: data.googleId });
    if (existing) return existing;

    const user = new this.userModel(data);
    return user.save();
  }

  // Find user by Google ID
  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId });
  }

  // Link Telegram user ID to a Google account
  async linkTelegram(googleId: string, telegramUserId: number): Promise<UserDocument | null> {
    return this.userModel.findOneAndUpdate(
      { googleId },
      { telegramUserId },
      { new: true },
    );
  }
}
