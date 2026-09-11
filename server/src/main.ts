import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // Get the ConfigService to read env vars
  const config = app.get(ConfigService);

  // Enable CORS for the React frontend
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  // Set global prefix so all routes are /api/...
  app.setGlobalPrefix('api');

  //newly added
  // Parse text/plain bodies (for WhatsApp chat import)
  app.use(bodyParser.text({ type: 'text/plain' }));

  // Enable input validation on all endpoints
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Start the server
  const port = config.get<number>('PORT', 4000);
  // await app.listen(port);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 BRL TAT Portal API running on http://localhost:${port}`);
}
bootstrap();

// CORS (Cross-Origin Resource Sharing)
// The React frontend runs on http://localhost:3000 and the API runs on http://localhost:4000. Browsers block requests between different ports by default. CORS tells the browser "it's okay, allow the frontend to talk to this API."

// setGlobalPrefix('api')
// All routes are prefixed with /api. So @Get('inquiries') becomes GET /api/inquiries, not GET /inquiries. This keeps the API clean and separates it from any static file serving.

// ValidationPipe
// Automatically validates incoming request bodies using class-validator decorators. If someone sends invalid data (wrong types, missing required fields), NestJS returns a 400 Bad Request error automatically.

// app.listen(port)
// Starts the HTTP server on port 4000 (from .env).
