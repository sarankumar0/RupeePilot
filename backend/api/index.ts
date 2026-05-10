import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';

const expressApp = express();
const adapter = new ExpressAdapter(expressApp);
let initialized = false;

async function bootstrap() {
  if (initialized) return;
  const app = await NestFactory.create(AppModule, adapter, { logger: false });
  const allowedOrigins = [
    'http://localhost:3001',
    process.env.FRONTEND_URL,
  ].filter(Boolean);
  app.enableCors({ origin: allowedOrigins });
  await app.init();
  initialized = true;
}

export default async function handler(req: any, res: any) {
  await bootstrap();
  expressApp(req, res);
}
