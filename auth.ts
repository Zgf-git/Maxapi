import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyPassword } from "@/lib/auth/password";
import {
  clearLoginThrottle,
  getClientIpAddress,
  getLoginRateLimitStatus,
  getLoginThrottleKey,
  recordFailedLoginAttempt
} from "@/lib/auth/rate-limit";
import { authSchema } from "@/lib/auth/validation";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.AUTH_SECRET,
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/sign-in"
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: {},
        password: {}
      },
      async authorize(credentials, request) {
        const email =
          typeof credentials?.email === "string" ? credentials.email.toLowerCase() : "unknown";
        const throttleKey = getLoginThrottleKey(email, getClientIpAddress(request));
        const throttle = await getLoginRateLimitStatus(throttleKey);

        if (!throttle.allowed) {
          return null;
        }

        const parsed = authSchema.omit({ name: true }).safeParse(credentials);

        if (!parsed.success) {
          await recordFailedLoginAttempt(throttleKey);
          return null;
        }

        const user = await db.user.findUnique({
          where: {
            email: parsed.data.email.toLowerCase()
          }
        });

        if (!user) {
          await recordFailedLoginAttempt(throttleKey);
          return null;
        }

        const isValid = await verifyPassword(parsed.data.password, user.passwordHash);

        if (!isValid) {
          await recordFailedLoginAttempt(throttleKey);
          return null;
        }

        if (env.AUTH_REQUIRE_EMAIL_VERIFICATION && !user.emailVerifiedAt) {
          await recordFailedLoginAttempt(throttleKey);
          return null;
        }

        await clearLoginThrottle(throttleKey);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      } else if (token.sub) {
        const currentUser = await db.user.findUnique({
          where: {
            id: token.sub
          },
          select: {
            role: true
          }
        });

        if (currentUser) {
          token.role = currentUser.role;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as any;
      }

      return session;
    }
  }
});
