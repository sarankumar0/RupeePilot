import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const expressApp = express();
const adapter = new ExpressAdapter(expressApp);
let initialized = false;

async function bootstrap() {
  if (initialized) return;
  const app = await NestFactory.create(AppModule, adapter, { logger: false });
  // Only allow our own frontend to make credentialed requests — never reflect
  // arbitrary origins (that + credentials:true would let any site call the API).
  const allowedOrigins = [
    'http://localhost:3001',
    process.env.FRONTEND_URL, // e.g. https://rupeepilot-frontend.vercel.app
  ].filter(Boolean);
  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Authorization',
  });
  await app.init();
  initialized = true;
}

export default async function handler(req: any, res: any) {
  await bootstrap();
  expressApp(req, res);
}
