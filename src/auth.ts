import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import {
  authorizeCredentials,
  logSessionRefreshDatabaseError,
} from "@/lib/auth/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
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
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
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
});
