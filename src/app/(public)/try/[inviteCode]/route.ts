import { NextResponse } from "next/server";

import {
  TRIAL_INVITE_COOKIE_MAX_AGE_SECONDS,
  TRIAL_INVITE_COOKIE_NAME,
} from "@/config/trial";
import {
  normalizeTrialInviteToken,
  validateTrialInviteToken,
} from "@/lib/trial/invites";

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store, private",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await context.params;
  const token = normalizeTrialInviteToken(inviteCode);
  const validation = token
    ? await validateTrialInviteToken(token)
    : "invalid";
  const destination = new URL("/try", request.url);

  if (validation !== "valid" || !token) {
    destination.searchParams.set("error", "invalid_invite");
    const response = NextResponse.redirect(destination, {
      status: 303,
      headers: PRIVATE_RESPONSE_HEADERS,
    });
    response.cookies.delete(TRIAL_INVITE_COOKIE_NAME);
    return response;
  }

  const response = NextResponse.redirect(destination, {
    status: 303,
    headers: PRIVATE_RESPONSE_HEADERS,
  });
  response.cookies.set(TRIAL_INVITE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TRIAL_INVITE_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
