import { z } from "zod";

import { isSupportedRerankModel } from "@/lib/chat/constants";
import { ApiRouteError } from "@/lib/chat/errors";
import type { RerankRequestInput } from "@/lib/providers/types";

const requestSchema = z.object({
  model: z.string().min(1),
  query: z.string().min(1),
  documents: z.array(z.string().min(1)).min(1).max(100),
  top_n: z.number().int().positive().optional(),
  return_documents: z.boolean().optional()
});

export function parseRerankRequest(payload: unknown): RerankRequestInput {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiRouteError(400, "invalid_request", "Request body must be a JSON object.");
  }

  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiRouteError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid rerank request.");
  }

  if (!isSupportedRerankModel(parsed.data.model)) {
    throw new ApiRouteError(400, "unsupported_model", `Unsupported model: ${parsed.data.model}.`, "unsupported_model");
  }

  return parsed.data;
}
