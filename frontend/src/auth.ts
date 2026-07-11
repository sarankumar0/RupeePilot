import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import jwt from 'jsonwebtoken';

// Mint a token the NestJS backend trusts. The frontend is the OAuth authority —
// once Google verifies the login we sign a JWT with the shared BACKEND_JWT_SECRET
// carrying the user's googleId in the `sub` claim. The backend's AuthGuard verifies
// it on every request, so no endpoint has to trust an ID passed in the URL.
function mintBackendToken(googleId: string): string {
  return jwt.sign({ sub: googleId }, process.env.BACKEND_JWT_SECRET!, {
    expiresIn: '30d',
  });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // On first sign-in, capture the real Google ID from the account.
      if (account?.provider === 'google' && account.providerAccountId) {
        token.googleId = account.providerAccountId;
      }
      // Re-mint the backend token on every session touch so it never expires mid-session.
      if (token.googleId) {
        token.backendToken = mintBackendToken(token.googleId as string);
      }
      // On first sign-in, register/find the user in the backend (authenticated).
      if (account?.provider === 'google' && user) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token.backendToken as string}`,
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              avatar: user.image,
            }),
          });
        } catch (e) {
          console.error('Failed to sync user to backend', e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.googleId) {
        (session.user as any).googleId = token.googleId;
      }
      // Expose the backend token so server components and client components can
      // attach it as `Authorization: Bearer` when calling the API.
      (session as any).backendToken = token.backendToken;
      return session;
    },
  },
});
