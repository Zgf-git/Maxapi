"use server";

import { getActionUser } from "@/lib/auth/session";
import { executePlaygroundRequest } from "@/lib/playground/service";
import type { PlaygroundActionResult, PlaygroundPayload } from "@/lib/playground/types";
import { headers } from "next/headers";

async function getClientIp() {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return requestHeaders.get("x-real-ip");
}

export async function runPlaygroundAction(payload: PlaygroundPayload): Promise<PlaygroundActionResult> {
  const user = await getActionUser();

  if (!user?.id) {
    return {
      ok: false,
      status: 401,
      code: "unauthorized",
      message: "Sign in before running playground requests."
    };
  }

  return executePlaygroundRequest(user.id, payload, await getClientIp());
}
