import { NextResponse } from "next/server";

import { getEarlyAccessStatus } from "@/lib/early-access/status";

export async function GET() {
  const status = await getEarlyAccessStatus();
  return NextResponse.json(status);
}