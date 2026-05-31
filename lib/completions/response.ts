import type { ChatCompletionResponse } from "@/lib/providers/types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toCompletionResponse(response: ChatCompletionResponse) {
  return {
    id: response.id,
    object: "text_completion",
    created: response.created,
    model: response.model,
    choices: response.choices.map((choice) => ({
      text: choice.message.content ?? "",
      index: choice.index,
      logprobs: null,
      finish_reason: choice.finish_reason
    })),
    usage: response.usage ?? undefined
  };
}

export function toCompletionStream(stream: ReadableStream<Uint8Array>) {
  let lineBuffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = stream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const text = decoder.decode(value, { stream: true });
          lineBuffer += text;

          const completeLines = lineBuffer.split("\n");
          lineBuffer = completeLines.pop() ?? "";

          for (const line of completeLines) {
            if (!line.startsWith("data: ")) {
              continue;
            }

            if (line === "data: [DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              continue;
            }

            try {
              const parsed = JSON.parse(line.slice(6)) as {
                id: string;
                object: string;
                created: number;
                model: string;
                choices?: Array<{
                  index: number;
                  finish_reason: string | null;
                  delta?: {
                    content?: string | null;
                  };
                }>;
              };

              const choices =
                parsed.choices?.map((choice) => ({
                  text: choice.delta?.content ?? "",
                  index: choice.index,
                  logprobs: null,
                  finish_reason: choice.finish_reason
                })) ?? [];

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    id: parsed.id,
                    object: "text_completion",
                    created: parsed.created,
                    model: parsed.model,
                    choices
                  })}\n\n`
                )
              );
            } catch {
              controller.enqueue(encoder.encode(`${line}\n`));
            }
          }
        }

        controller.close();
      } finally {
        reader.releaseLock();
      }
    },
    async cancel(reason) {
      await stream.cancel(reason).catch(() => undefined);
    }
  });
}
