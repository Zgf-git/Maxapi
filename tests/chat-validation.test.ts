import { describe, expect, it } from "vitest";

import { ApiRouteError } from "@/lib/chat/errors";
import { parseChatCompletionRequest } from "@/lib/chat/validation";

describe("chat completion validation", () => {
  it("rejects unsupported request fields", () => {
    expect(() =>
      parseChatCompletionRequest({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello" }],
        frequency_penalty: 1
      })
    ).toThrowError(ApiRouteError);
  });

  it("accepts the supported OpenAI-compatible subset", () => {
    const result = parseChatCompletionRequest({
      route_policy: "balanced",
      session_id: "thread_123",
      messages: [{ role: "user", content: "Hello" }],
      stream: false,
      response_format: {
        type: "json_object"
      }
    });

    expect(result.route_policy).toBe("balanced");
    expect(result.session_id).toBe("thread_123");
    expect(result.response_format?.type).toBe("json_object");
  });

  it("rejects assistant messages without content and tool calls", () => {
    expect(() =>
      parseChatCompletionRequest({
        model: "gpt-4o",
        messages: [{ role: "assistant", content: null }]
      })
    ).toThrowError(ApiRouteError);
  });

  it("rejects requests without model or route policy", () => {
    expect(() =>
      parseChatCompletionRequest({
        messages: [{ role: "user", content: "Hello" }]
      })
    ).toThrowError(ApiRouteError);
  });
});
