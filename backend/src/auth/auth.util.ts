import * as jwt from 'jsonwebtoken';

// The frontend (the OAuth authority) mints a short-lived token signed with this
// shared secret after Google verifies the login; the backend only verifies it.
// Identity (googleId) is carried in the standard `sub` claim.
export interface UserTokenPayload {
  sub: string; // googleId
}

function getSecret(): string {
  const secret = process.env.BACKEND_JWT_SECRET;
  if (!secret) {
    // Fail loudly rather than silently accepting/rejecting everything.
    throw new Error('BACKEND_JWT_SECRET is not set');
  }
  return secret;
}

export function verifyUserToken(token: string): UserTokenPayload {
  const payload = jwt.verify(token, getSecret()) as jwt.JwtPayload;
  if (!payload.sub) throw new Error('Token missing sub claim');
  return { sub: payload.sub };
}
