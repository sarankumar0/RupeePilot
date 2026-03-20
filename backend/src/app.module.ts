import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExpensesModule } from './expenses/expenses.module';

@Module({
  imports: [
    // Load .env file first so all other modules can use the values inside it
    ConfigModule.forRoot({ isGlobal: true }),

    // Connect to MongoDB using the URI from .env
    // The '!' tells TypeScript: "trust me, this value exists in .env"
    MongooseModule.forRoot(process.env.MONGODB_URI!),

    // Our expenses feature module
    ExpensesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
