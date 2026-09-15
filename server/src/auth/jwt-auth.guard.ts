import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

// ─── The guard that actually blocks unauthenticated requests ───
// 'jwt' here matches the strategy name Passport registers for
// JwtStrategy (it defaults to the class name's strategy type).
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  // ─── Skip the check entirely for routes marked @Public() ───
  // Needed for /auth/login (you can't require a token to get a token)
  // and the external webhook endpoints (Meta/DoubleTick/Evolution can't
  // send a JWT — they authenticate with their own secret headers instead).
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    return super.canActivate(context);
  }
}
