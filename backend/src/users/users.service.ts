import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

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

  // Find user by their Telegram ID — used by the bot to load budget info
  async findByTelegramId(telegramUserId: number): Promise<UserDocument | null> {
    return this.userModel.findOne({ telegramUserId });
  }

  // Save the user's monthly budget
  async setBudget(googleId: string, monthlyBudget: number): Promise<UserDocument | null> {
    return this.userModel.findOneAndUpdate(
      { googleId },
      { $set: { monthlyBudget } },
      { returnDocument: 'after' },
    );
  }

  // Save the user's monthly income — used in weekly reports
  async setIncome(googleId: string, monthlyIncome: number): Promise<UserDocument | null> {
    return this.userModel.findOneAndUpdate(
      { googleId },
      { $set: { monthlyIncome } },
      { returnDocument: 'after' },
    );
  }

  // Get all users who have linked their Telegram — used for weekly report broadcast
  async findAllLinked(): Promise<UserDocument[]> {
    return this.userModel.find({ telegramUserId: { $exists: true, $ne: null } }).exec();
  }

  // Generate a random 6-character code and save it on the user
  // The user will type this code in the Telegram bot to link their account
  async generateLinkCode(googleId: string): Promise<string> {
    // Make a random 6-char uppercase code like "XK7P2M"
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    this.logger.log(`Generating link code "${code}" for googleId: ${googleId}`);

    const updated = await this.userModel.findOneAndUpdate(
      { googleId },
      { $set: { linkCode: code } },
      { new: true },
    );

    if (!updated) {
      this.logger.error(`No user found in MongoDB with googleId: ${googleId}`);
    } else {
      this.logger.log(`Saved linkCode "${code}" to user: ${updated.email}`);
    }

    return code;
  }

  // Called by the Telegram bot when user types /link <code>
  // Finds the user who owns that code, saves their telegramUserId, clears the code
  async linkByCode(code: string, telegramUserId: number): Promise<UserDocument | null> {
    this.logger.log(`Trying to link by code "${code}" for telegramUserId: ${telegramUserId}`);

    const user = await this.userModel.findOneAndUpdate(
      { linkCode: code },
      { $set: { telegramUserId }, $unset: { linkCode: '' } },
      { new: true },
    );

    if (!user) {
      this.logger.error(`No user found with linkCode: ${code}`);
    } else {
      this.logger.log(`Linked telegramUserId ${telegramUserId} to user: ${user.email}`);
    }

    return user;
  }
}
