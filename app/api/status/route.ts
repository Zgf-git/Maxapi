import { NextResponse } from "next/server";

import { getSystemStatus } from "@/lib/status/service";

export async function GET() {
  const status = await getSystemStatus();

  return NextResponse.json(status);
}
