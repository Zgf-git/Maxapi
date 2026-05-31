import { NextResponse } from "next/server";

import { getPublicCatalogModels } from "@/lib/catalog";
import { getConfiguredProviders, isProviderConfigured } from "@/lib/providers/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const models = getPublicCatalogModels();
  const configuredProviders = await getConfiguredProviders();

  return NextResponse.json({
    object: "list",
    data: await Promise.all(models.map(async (model) => ({
      id: model.id,
      object: "model",
      created: 0,
      owned_by: model.provider,
      permission: [],
      maxapi: {
        label: model.label,
        provider: model.provider,
        upstream_model: model.upstreamModel,
        category: model.category,
        supports_streaming: model.supportsStreaming,
        supports_tools: model.supportsTools,
        status: model.status,
        provider_available: await isProviderConfigured(model.provider),
        configured_providers: configuredProviders
      }
    })))
  });
}
