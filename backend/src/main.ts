import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow requests from frontend — supports both local dev and production
  const allowedOrigins = [
    'http://localhost:3001',
    process.env.FRONTEND_URL, // set this to your Vercel URL in production
  ].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
