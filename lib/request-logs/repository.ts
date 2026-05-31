import { RequestLogStatus, RequestType } from "@prisma/client";

import { db } from "@/lib/db";

type RequestLogWrite = {
  apiKeyId?: string | null;
  userId?: string | null;
  provider: string;
  upstreamModel?: string | null;
  requestedModel?: string | null;
  routePolicy?: string | null;
  fallbackUsed?: boolean;
  fallbackFromProvider?: string | null;
  fallbackFromModel?: string | null;
  routeReason?: string | null;
  requestType: RequestType;
  isStream: boolean;
  status: RequestLogStatus;
  httpStatus: number;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  latencyMs?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export async function createRequestLog(input: RequestLogWrite) {
  return db.requestLog.create({
    data: input
  });
}

export async function updateRequestLog(
  requestLogId: string,
  input: Partial<Omit<RequestLogWrite, "provider" | "requestType" | "isStream">>
) {
  return db.requestLog.update({
    where: { id: requestLogId },
    data: input
  });
}
