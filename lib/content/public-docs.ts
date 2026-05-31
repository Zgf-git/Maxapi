import { getCatalogPolicyEntries, getPublicCatalogModels } from "@/lib/catalog";

export const PUBLIC_API_BASE_URL = "https://your-maxapi-domain.com";

export const PUBLIC_LIMITATIONS = [
  "OpenAI-compatible gateway with managed routing and provider failover.",
  "Image generation API coming soon.",
  "Public support today focuses on text chat and embeddings."
] as const;

export const PUBLIC_SDK_EXAMPLES = {
  python: `from openai import OpenAI

client = OpenAI(
    base_url="https://your-maxapi-domain.com/v1",
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}]
)
print(response.choices[0].message.content)`,
  node: `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://your-maxapi-domain.com/v1',
  apiKey: 'your-api-key'
});

const response = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello' }]
});
console.log(response.choices[0].message.content);`,
  curl: `curl -X POST https://your-maxapi-domain.com/v1/chat/completions \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`
} as const;

export const PUBLIC_ERROR_GUIDE = [
  {
    code: "unauthorized",
    description: "The Authorization header is missing or is not a valid Bearer token."
  },
  {
    code: "invalid_api_key",
    description: "The Bearer token was well-formed, but it does not match an active MaxAPI key."
  },
  {
    code: "revoked_api_key",
    description: "The API key exists but has been revoked and can no longer be used for requests."
  },
  {
    code: "insufficient_balance",
    description: "The account balance is below the minimum gate for starting a new request."
  },
  {
    code: "unsupported_model",
    description: "The explicit model id is not part of the current supported public allowlist."
  },
  {
    code: "invalid_request",
    description: "The request body failed server-side validation or used unsupported fields."
  },
  {
    code: "upstream_error",
    description: "The routed upstream provider failed or returned a retryable/non-retryable error."
  }
] as const;

export const PUBLIC_FAQ = [
  {
    question: "What is the difference between route_policy and model?",
    answer:
      "Use model when you want a specific supported public model id. Use route_policy when you want the platform to choose a managed server-side route with one conservative fallback path."
  },
  {
    question: "Does Cheap always use the same provider?",
    answer:
      "No. Cheap is a managed route policy with a preferred target and a fallback path. The actual provider/model can vary if fallback is needed."
  },
  {
    question: "How am I billed?",
    answer:
      "Billing is usage-based. Charges are derived from actual provider-reported usage and the pricing snapshot tied to the routed provider/model."
  },
  {
    question: "Do you support streaming?",
    answer:
      "Yes, streaming is supported on the current public text models through the same OpenAI-compatible chat completions path."
  },
  {
    question: "What is currently supported?",
    answer:
      "Public support is limited to text-only chat completions, explicit public model ids, and managed route policies on /v1/chat/completions."
  }
] as const;

export function getPublicPageData() {
  return {
    policies: getCatalogPolicyEntries(),
    models: getPublicCatalogModels(),
    limitations: PUBLIC_LIMITATIONS,
    errors: PUBLIC_ERROR_GUIDE,
    faq: PUBLIC_FAQ
  };
}
