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
    async signIn({ user, account }) {
      // upsertUser here — signIn callback runs in the full request context,
      // so getCloudflareContext() / D1 binding is available on CF Pages.
      if (account && user.email) {
        const userId = account.providerAccountId; // stable Google numeric sub
        try {
          await upsertUser({
            id: userId,
            email: user.email,
            name: user.name,
            image: user.image,
          });
        } catch (e) {
          console.error("[auth] upsertUser failed:", e);
          // Do NOT block sign-in on DB errors
        }
      }
      return true;
    },
    async jwt({ token, account }) {
      if (account) {
        // Pin sub to Google's stable providerAccountId (numeric string)
        token.sub = account.providerAccountId;
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
