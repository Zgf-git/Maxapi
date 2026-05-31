import type { ChatCompletionResponse } from "@/lib/providers/types";

export function toResponsesApiResponse(completion: ChatCompletionResponse) {
  const outputText = completion.choices
    .map((choice) => choice.message.content)
    .filter((content): content is string => typeof content === "string")
    .join("\n");

  return {
    id: completion.id.replace(/^chatcmpl-/, "resp_"),
    object: "response",
    created_at: completion.created,
    status: "completed",
    model: completion.model,
    output: completion.choices.map((choice) => ({
      id: `${completion.id}-msg-${choice.index}`,
      type: "message",
      status: "completed",
      role: "assistant",
      content: [
        {
          type: "output_text",
          text: choice.message.content ?? ""
        }
      ],
      finish_reason: choice.finish_reason
    })),
    output_text: outputText,
    usage: completion.usage ?? null
  };
}
