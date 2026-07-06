import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function GET() {
  try {
    throw new Error("Sentry test error - delete this route after testing");
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ message: "Test error sent to Sentry" });
  }
}