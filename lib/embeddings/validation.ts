import { z } from "zod";

import { isSupportedEmbeddingModel } from "@/lib/chat/constants";
import { ApiRouteError } from "@/lib/chat/errors";
import type { EmbeddingRequestInput } from "@/lib/providers/types";

const requestSchema = z.object({
  model: z.string().min(1),
  input: z.union([
    z.string().min(1),
    z.array(z.string().min(1)).min(1)
  ]),
  dimensions: z.number().int().positive().optional(),
  encoding_format: z.enum(["float", "base64"]).optional(),
  user: z.string().min(1).optional()
});

export function parseEmbeddingsRequest(payload: unknown): EmbeddingRequestInput {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiRouteError(400, "invalid_request", "Request body must be a JSON object.");
  }

  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiRouteError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid embeddings request.");
  }

  if (!isSupportedEmbeddingModel(parsed.data.model)) {
    throw new ApiRouteError(400, "unsupported_model", `Unsupported model: ${parsed.data.model}.`, "unsupported_model");
  }

  return parsed.data;
}
