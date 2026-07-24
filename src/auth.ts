import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { authConfig } from "@/auth.config";
import {
  authorizeCredentials,
  logSessionRefreshDatabaseError,
} from "@/lib/auth/credentials";
import {
  isGoogleAuthConfigured,
  isGoogleSignInAllowed,
  type GoogleProfileLike,
} from "@/lib/auth/google";
import {
  shouldMarkEmailVerifiedOnGoogleSignIn,
  shouldSendWelcomeOnCreateUser,
} from "@/lib/auth/google-auth-events";
import { prisma } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";

const credentialsProvider = Credentials({
  name: "credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials, request) {
    return authorizeCredentials(credentials, request, {
      findUserByEmail: (email) =>
        prisma.user.findFirst({
          where: {
            email: {
              equals: email,
              mode: "insensitive",
            },
          },
        }),
      comparePassword: bcrypt.compare,
    });
  },
});

const providers = [
  credentialsProvider,
  ...(isGoogleAuthConfigured()
    ? [
        Google({
          // Safe only because signIn callback requires Google email_verified.
          // Links existing User by email so password users keep plan/data.
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        return isGoogleSignInAllowed(profile as GoogleProfileLike);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.plan = user.plan;
        token.role = user.role;
      }

      if (token.id) {
        let dbUser;
        try {
          dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { plan: true, role: true },
          });
        } catch (error) {
          logSessionRefreshDatabaseError({
            userId: token.id as string,
            email: token.email,
            error,
          });
          throw error;
        }

        if (dbUser) {
          token.plan = dbUser.plan;
          token.role = dbUser.role;
        }
      }

      return token;
    },
    session: authConfig.callbacks.session,
  },
  events: {
    async createUser({ user }) {
      if (
        !shouldSendWelcomeOnCreateUser({
          userId: user.id,
          email: user.email,
        })
      ) {
        return;
      }

      void sendWelcomeEmail({
        userId: user.id!,
        email: user.email!,
        name: user.name ?? null,
      }).catch((error) => {
        console.error("[email] Welcome email task failed (OAuth createUser):", error);
      });
    },
    async signIn({ user, account, profile }) {
      if (
        !user?.id ||
        !shouldMarkEmailVerifiedOnGoogleSignIn({
          provider: account?.provider,
          profile: profile as GoogleProfileLike,
        })
      ) {
        return;
      }

      try {
        await prisma.user.updateMany({
          where: {
            id: user.id,
            emailVerified: null,
          },
          data: {
            emailVerified: new Date(),
          },
        });
      } catch (error) {
        console.error("[auth] Failed to set emailVerified from Google:", error);
      }
    },
  },
});
