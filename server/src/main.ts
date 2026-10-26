import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import helmet from 'helmet';

// ─── Safety net: worker/OCR errors must never kill the server ───
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION — server kept alive]', err);
});
process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION — server kept alive]', err);
});

async function bootstrap() {
  // const app = await NestFactory.create(AppModule, { cors: true });
  // NOTE: plain create() — CORS is configured once below via enableCors().
  // (Previously `{ cors: true }` here briefly enabled permissive CORS
  //  before enableCors() overrode it — redundant and confusing.)
  const app = await NestFactory.create(AppModule);

  // Get the ConfigService to read env vars
  const config = app.get(ConfigService);

  // ─── Trust the reverse proxy (nginx) so we see the real client IP ───
  // Without this, every request behind nginx looks like 127.0.0.1, and the
  // rate limiter would lump ALL users into one bucket. Use 2 if Cloudflare
  // also sits in front of nginx.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // ─── FAIL FAST: refuse to boot without critical secrets ───
  // Previously JWT_SECRET fell back to the literal 'dev-secret', which
  // meant a missing env var silently made every JWT forgeable.
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = required.filter((k) => !config.get<string>(k));
  if (missing.length) {
    new Logger('Bootstrap').error(
      `FATAL: missing required env var(s): ${missing.join(', ')} — refusing to start.`,
    );
    process.exit(1);
  }

  // ─── Security headers ───
  // crossOriginResourcePolicy disabled so it doesn't fight the API's CORS.
  app.use(helmet({ crossOriginResourcePolicy: false }));

  // ─── Require a valid JWT on every route by default ───
  // Without this, every controller in the app is reachable by anyone
  // with network access — no login required. JwtAuthGuard checks for
  // @Public() first, so /auth/login and the webhook endpoints still work.
  // We fetch JwtAuthGuard via app.get() (instead of `new JwtAuthGuard()`)
  // so Nest's DI container injects the Reflector it depends on.
  app.useGlobalGuards(app.get(JwtAuthGuard));

  // Enable CORS for the React frontend
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  // Set global prefix so all routes are /api/...
  app.setGlobalPrefix('api');

  // ─── Capture the RAW body for the Meta webhook signature check ───
  // Must be registered before Nest's own JSON parser consumes the body.
  app.use(
    bodyParser.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

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
