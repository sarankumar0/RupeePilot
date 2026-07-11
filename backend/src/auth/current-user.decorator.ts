import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  googleId: string;
}

// Pulls the authenticated user (set by AuthGuard) off the request.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
