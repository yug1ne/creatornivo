import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { AUTH_RATE_LIMIT_GENERIC_MESSAGE } from "@/config/auth-rate-limit";
import {
  CredentialsRegistrationError,
  REGISTRATION_EMAIL_NOT_ALLOWED_MESSAGE,
  registerCredentialsUser,
} from "@/lib/auth/credentials";
import { issueAndSendEmailVerification } from "@/lib/auth/issue-email-verification";
import {
  AuthRateLimitError,
  AuthRateLimitUnavailableError,
  AUTH_RATE_LIMIT_UNAVAILABLE_MESSAGE,
  enforceAuthRateLimit,
} from "@/lib/auth/rate-limit";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";
import { prisma } from "@/lib/db";

type RegisterRouteDependencies = {
  enforceRateLimit?: typeof enforceAuthRateLimit;
  issueVerification?: typeof issueAndSendEmailVerification;
  sendWelcome?: typeof sendWelcomeEmail;
};

export async function postAuthRegister(
  request: Request,
  dependencies: RegisterRouteDependencies = {},
) {
  const enforceRateLimit = dependencies.enforceRateLimit ?? enforceAuthRateLimit;
  const issueVerification =
    dependencies.issueVerification ?? issueAndSendEmailVerification;
  const sendWelcome = dependencies.sendWelcome ?? sendWelcomeEmail;

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

    void issueVerification({
      email: user.email,
      name: user.name,
    }).catch((error) => {
      console.error("[email] Verification email task failed:", error);
    });

    void sendWelcome({
      userId: user.id,
      email: user.email,
      name: user.name,
    }).catch((error) => {
      console.error("[email] Welcome email task failed:", error);
    });

    return NextResponse.json(
      { message: "Registration successful", user },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AuthRateLimitUnavailableError) {
      return NextResponse.json(
        { error: AUTH_RATE_LIMIT_UNAVAILABLE_MESSAGE },
        { status: 503 },
      );
    }

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
      if (error.code === "email_not_allowed") {
        return NextResponse.json(
          { error: REGISTRATION_EMAIL_NOT_ALLOWED_MESSAGE },
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