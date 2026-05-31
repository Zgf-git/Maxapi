import { NextResponse } from "next/server";

import { sanitizeErrorMessage } from "@/lib/chat/errors";

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      error: {
        message,
        type: code,
        code
      }
    },
    { status }
  );
}

export function sanitizeProviderError(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object"
  ) {
    const errorObject = payload.error as Record<string, unknown>;

    return {
      code: typeof errorObject.code === "string" ? errorObject.code : "upstream_error",
      message:
        sanitizeErrorMessage(
          typeof errorObject.message === "string" ? errorObject.message : "Upstream provider error."
        ) ?? "Upstream provider error."
    };
  }

  if (payload && typeof payload === "object") {
    const payloadObject = payload as Record<string, unknown>;

    return {
      code: typeof payloadObject.code === "string" ? payloadObject.code : "upstream_error",
      message:
        sanitizeErrorMessage(
          typeof payloadObject.message === "string" ? payloadObject.message : "Upstream provider error."
        ) ?? "Upstream provider error."
    };
  }

  return {
    code: "upstream_error",
    message: "Upstream provider error."
  };
}
