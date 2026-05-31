import { getRequiredEnvBackedProviderConfig } from "@/lib/providers/factory";
import { OpenAICompatibleProvider } from "@/lib/providers/openai-compatible";

export class OpenAIChatProvider extends OpenAICompatibleProvider {
  constructor() {
    super(getRequiredEnvBackedProviderConfig("openai"));
  }
}
