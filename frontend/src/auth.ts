import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && account.providerAccountId) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              googleId: account.providerAccountId,
              email: user.email,
              name: user.name,
              avatar: user.image,
            }),
          });
        } catch (e) {
          console.error('Failed to sync user to backend', e);
        }
      }
      return true;
    },
    async jwt({ token, account }) {
      // On first sign-in, account is available — save the real Google ID into the token
      if (account?.provider === 'google') {
        token.googleId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      // Pass the real Google ID (saved in jwt callback) to the session
      if (session.user && token.googleId) {
        (session.user as any).googleId = token.googleId;
      }
      return session;
    },
  },
});
