import { z } from "zod";

import { ApiRouteError } from "@/lib/chat/errors";
import { parseChatCompletionRequest } from "@/lib/chat/validation";
import type { ChatCompletionRequestInput } from "@/lib/providers/types";

const responseMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.union([
    z.string().min(1),
    z.array(z.object({
      type: z.string(),
      text: z.string().optional()
    })).min(1)
  ])
});

const responsesSchema = z.object({
  model: z.string().min(1).optional(),
  route_policy: z.enum(["cheap", "balanced", "premium", "auto"]).optional(),
  routing_strategy: z.enum(["priority", "cost"]).optional(),
  input: z.union([z.string().min(1), z.array(responseMessageSchema).min(1)]),
  instructions: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_output_tokens: z.number().int().positive().optional(),
  stream: z.boolean().optional()
}).superRefine((value, ctx) => {
  if (!value.model && !value.route_policy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either model or route_policy must be provided."
    });
  }
});

function contentToText(content: z.infer<typeof responseMessageSchema>["content"]) {
  if (typeof content === "string") {
    return content;
  }

  return content.map((part) => part.text).filter(Boolean).join("\n");
}

export function parseResponsesRequest(payload: unknown): ChatCompletionRequestInput {
  const parsed = responsesSchema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiRouteError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid responses request.");
  }

  if (parsed.data.stream) {
    throw new ApiRouteError(400, "unsupported_feature", "Streaming Responses API compatibility is not available yet.");
  }

  const messages: ChatCompletionRequestInput["messages"] = [];

  if (parsed.data.instructions) {
    messages.push({ role: "system", content: parsed.data.instructions });
  }

  if (typeof parsed.data.input === "string") {
    messages.push({ role: "user", content: parsed.data.input });
  } else {
    for (const message of parsed.data.input) {
      messages.push({
        role: message.role,
        content: contentToText(message.content)
      });
    }
  }

  return parseChatCompletionRequest({
    model: parsed.data.model,
    route_policy: parsed.data.route_policy,
    routing_strategy: parsed.data.routing_strategy,
    messages,
    temperature: parsed.data.temperature,
    top_p: parsed.data.top_p,
    max_tokens: parsed.data.max_output_tokens,
    stream: false
  });
}
