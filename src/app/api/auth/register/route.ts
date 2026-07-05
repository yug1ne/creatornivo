import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { AUTH_RATE_LIMIT_GENERIC_MESSAGE } from "@/config/auth-rate-limit";
import {
  CredentialsRegistrationError,
  registerCredentialsUser,
} from "@/lib/auth/credentials";
import { AuthRateLimitError, enforceAuthRateLimit } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/db";

type RegisterRouteDependencies = {
  enforceRateLimit?: typeof enforceAuthRateLimit;
};

export async function postAuthRegister(
  request: Request,
  dependencies: RegisterRouteDependencies = {},
) {
  const enforceRateLimit = dependencies.enforceRateLimit ?? enforceAuthRateLimit;

  try {
    const body = await request.json();
    const { name, email, password } = body as {
      name?: string;
      email?: string;
      password?: string;
    };

    await enforceRateLimit({
      action: "register",
      request,
      email,
    });

    const user = await registerCredentialsUser(
      { name, email, password },
      {
        findUserByEmail: (normalizedEmail) =>
          prisma.user.findFirst({
            where: {
              email: {
                equals: normalizedEmail,
                mode: "insensitive",
              },
            },
            select: { id: true },
          }),
        hashPassword: (plainPassword) => bcrypt.hash(plainPassword, 12),
        createUser: (data) =>
          prisma.user.create({
            data,
            select: {
              id: true,
              email: true,
              name: true,
              plan: true,
            },
          }),
      },
    );

    return NextResponse.json(
      { message: "Registration successful", user },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return NextResponse.json(
        { error: AUTH_RATE_LIMIT_GENERIC_MESSAGE },
        { status: 429 },
      );
    }

    if (error instanceof CredentialsRegistrationError) {
      if (error.code === "missing_credentials") {
        return NextResponse.json(
          { error: "Email and password are required" },
          { status: 400 },
        );
      }
      if (error.code === "password_too_short") {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 },
        );
      }
      if (error.code === "user_exists") {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return postAuthRegister(request);
}