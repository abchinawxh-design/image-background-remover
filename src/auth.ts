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
    async jwt({ token, account }) {
      if (account) {
        // Pin sub to Google's stable providerAccountId (numeric string)
        // This ensures the same user always gets the same ID across sessions
        token.sub = account.providerAccountId;
        try {
          await upsertUser({
            id: token.sub,
            email: token.email!,
            name: token.name,
            image: token.picture as string | undefined,
          });
        } catch (e) {
          console.error("[auth] upsertUser failed:", e);
        }
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      return session;
    },
    authorized: () => true,
  },
});
