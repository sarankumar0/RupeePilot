import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyUserToken } from './auth.util';

// Verifies the `Authorization: Bearer <jwt>` header and attaches the caller's
// identity to the request as `req.user = { googleId }`. Controllers derive the
// user from this — never from an ID passed in the URL or query string.
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    try {
      const payload = verifyUserToken(header.slice('Bearer '.length));
      req.user = { googleId: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
