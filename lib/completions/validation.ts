import { z } from "zod";

import { isSupportedChatModel } from "@/lib/chat/constants";
import { ApiRouteError } from "@/lib/chat/errors";
import { ROUTE_POLICIES, type ChatCompletionRequestInput } from "@/lib/providers/types";

const supportedKeys = new Set([
  "model",
  "route_policy",
  "prompt",
  "temperature",
  "top_p",
  "max_tokens",
  "stream",
  "stop"
]);

const requestSchema = z.object({
  model: z.string().min(1).optional(),
  route_policy: z.enum(ROUTE_POLICIES).optional(),
  prompt: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().positive().optional(),
  stream: z.boolean().optional(),
  stop: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional()
}).superRefine((value, ctx) => {
  if (!value.model && !value.route_policy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either model or route_policy must be provided."
    });
  }
});

export function parseCompletionRequest(payload: unknown): ChatCompletionRequestInput {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiRouteError(400, "invalid_request", "Request body must be a JSON object.");
  }

  const extraKeys = Object.keys(payload).filter((key) => !supportedKeys.has(key));

  if (extraKeys.length > 0) {
    throw new ApiRouteError(400, "invalid_request", `Unsupported field for this MVP: ${extraKeys[0]}.`);
  }

  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiRouteError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid completion request.");
  }

  if (parsed.data.model && !isSupportedChatModel(parsed.data.model)) {
    throw new ApiRouteError(400, "unsupported_model", `Unsupported model: ${parsed.data.model}.`, "unsupported_model");
  }

  return {
    model: parsed.data.model,
    route_policy: parsed.data.route_policy,
    messages: [{ role: "user", content: parsed.data.prompt }],
    temperature: parsed.data.temperature,
    top_p: parsed.data.top_p,
    max_tokens: parsed.data.max_tokens,
    stream: parsed.data.stream,
    stop: parsed.data.stop
  };
}
