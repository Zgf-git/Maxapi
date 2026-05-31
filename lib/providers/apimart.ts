import { getRequiredEnvBackedProviderConfig } from "@/lib/providers/factory";
import { OpenAICompatibleProvider } from "@/lib/providers/openai-compatible";

export class APIMartProvider extends OpenAICompatibleProvider {
  constructor() {
    super(getRequiredEnvBackedProviderConfig("apimart"));
  }
}
