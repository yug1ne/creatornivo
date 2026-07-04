import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import {
  CredentialsRegistrationError,
  registerCredentialsUser,
} from "@/lib/auth/credentials";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body as {
      name?: string;
      email?: string;
      password?: string;
    };

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
