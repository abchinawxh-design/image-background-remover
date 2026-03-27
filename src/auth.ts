import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { upsertUser } from "@/lib/user";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    // Persist user to D1 on first login / each session refresh
    async jwt({ token, user, account }) {
      if (account && user) {
        // First sign-in: user object is populated
        try {
          await upsertUser({
            id: token.sub!,
            email: token.email!,
            name: token.name,
            image: token.picture,
          });
        } catch (e) {
          // Non-fatal: log but don't break auth flow
          console.error("[auth] upsertUser failed:", e);
        }
      }
      return token;
    },
    // Expose user.id to client session
    session({ session, token }) {
      session.user.id = token.sub!;
      return session;
    },
    // Optional auth: all routes public
    authorized: () => true,
  },
});
