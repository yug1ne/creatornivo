import { NextResponse, type NextRequest } from "next/server";

import { handlers } from "@/auth";
import { AUTH_RATE_LIMIT_GENERIC_MESSAGE } from "@/config/auth-rate-limit";
import { AuthRateLimitError } from "@/lib/auth/rate-limit";

export const { GET } = handlers;

export async function POST(request: NextRequest) {
  try {
    return await handlers.POST(request);
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return NextResponse.json(
        { message: AUTH_RATE_LIMIT_GENERIC_MESSAGE },
        { status: 429 },
      );
    }

    throw error;
  }
}