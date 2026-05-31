import { z } from "zod";

import { isSupportedChatModel } from "@/lib/chat/constants";
import { ApiRouteError } from "@/lib/chat/errors";
import { ROUTE_POLICIES, ROUTING_STRATEGIES, type ChatCompletionRequestInput } from "@/lib/providers/types";

const supportedKeys = new Set([
  "model",
  "route_policy",
  "routing_strategy",
  "session_id",
  "messages",
  "temperature",
  "top_p",
  "max_tokens",
  "stream",
  "stop",
  "tools",
  "tool_choice",
  "response_format"
]);

const baseMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"])
});

const systemMessageSchema = baseMessageSchema.extend({
  role: z.literal("system"),
  content: z.string().min(1)
});

const userMessageSchema = baseMessageSchema.extend({
  role: z.literal("user"),
  content: z.string().min(1)
});

const assistantMessageSchema = baseMessageSchema
  .extend({
    role: z.literal("assistant"),
    content: z.string().min(1).nullable(),
    tool_calls: z.array(z.unknown()).optional()
  })
  .superRefine((value, ctx) => {
    const hasContent = typeof value.content === "string" && value.content.trim().length > 0;
    const hasToolCalls = Array.isArray(value.tool_calls) && value.tool_calls.length > 0;

    if (!hasContent && !hasToolCalls) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assistant messages must include non-empty content or non-empty tool_calls."
      });
    }
  });

const toolMessageSchema = baseMessageSchema.extend({
  role: z.literal("tool"),
  content: z.string().min(1),
  tool_call_id: z.string().min(1)
});

const requestSchema = z.object({
  model: z.string().min(1).optional(),
  route_policy: z.enum(ROUTE_POLICIES).optional(),
  routing_strategy: z.enum(ROUTING_STRATEGIES).optional(),
  session_id: z.string().min(1).max(128).optional(),
  messages: z.array(z.union([systemMessageSchema, userMessageSchema, assistantMessageSchema, toolMessageSchema])).min(1),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().positive().optional(),
  stream: z.boolean().optional(),
  stop: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
  tools: z.array(z.unknown()).optional(),
  tool_choice: z
    .union([
      z.enum(["auto", "none", "required"]),
      z.object({
        type: z.literal("function"),
        function: z.object({
          name: z.string().min(1)
        })
      })
    ])
    .optional(),
  response_format: z
    .object({
      type: z.literal("json_object")
    })
    .optional()
}).superRefine((value, ctx) => {
  if (!value.model && !value.route_policy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either model or route_policy must be provided."
    });
  }
});

export function parseChatCompletionRequest(payload: unknown): ChatCompletionRequestInput {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiRouteError(400, "invalid_request", "Request body must be a JSON object.");
  }

  const extraKeys = Object.keys(payload).filter((key) => !supportedKeys.has(key));

  if (extraKeys.length > 0) {
    throw new ApiRouteError(400, "invalid_request", `Unsupported field for this MVP: ${extraKeys[0]}.`);
  }

  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiRouteError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid chat completion request.");
  }

  if (parsed.data.model && !isSupportedChatModel(parsed.data.model)) {
    throw new ApiRouteError(400, "unsupported_model", `Unsupported model: ${parsed.data.model}.`, "unsupported_model");
  }

  return parsed.data;
}
