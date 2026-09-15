import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

// ─── Tells Passport how to pull a JWT out of a request and verify it ───
// This runs on every request that hits a route protected by AuthGuard('jwt').
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(envConfig: ConfigService) {
    super({
      // Look for "Authorization: Bearer <token>" — this is what the
      // frontend already sends (per auth.service.ts's login() comment).
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // Reject expired tokens automatically (passport-jwt checks this
      // using the "exp" claim baked in by JwtService.sign() at login).
      ignoreExpiration: false,

      // Must match the secret used to SIGN the token in auth.module.ts,
      // or every token will fail verification.
      secretOrKey: envConfig.get<string>('JWT_SECRET', 'dev-secret'),
    });
  }

  // ─── Runs after the signature + expiry check passes ───
  // Whatever this returns becomes `request.user` in every controller.
  async validate(payload: { sub: string; email: string; role: string }) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
