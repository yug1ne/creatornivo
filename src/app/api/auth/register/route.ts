import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name?.trim() || null,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
      },
    });

    return NextResponse.json(
      { message: "Registration successful", user },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 },
    );
  }
}