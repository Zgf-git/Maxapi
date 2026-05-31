import { PUBLIC_API_BASE_URL } from "@/lib/content/public-docs";

export const DASHBOARD_API_KEY_PLACEHOLDER = "YOUR_API_KEY";

export function buildCurlRoutePolicyExample(apiKey = DASHBOARD_API_KEY_PLACEHOLDER) {
  return `curl ${PUBLIC_API_BASE_URL}/v1/chat/completions \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "route_policy": "auto",
    "messages": [
      { "role": "user", "content": "Write a concise launch update." }
    ],
    "stream": false
  }'`;
}

export function buildCurlExplicitModelExample(apiKey = DASHBOARD_API_KEY_PLACEHOLDER) {
  return `curl ${PUBLIC_API_BASE_URL}/v1/chat/completions \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [
      { "role": "user", "content": "Summarize this release note." }
    ]
  }'`;
}

export function buildJavaScriptExample(apiKey = DASHBOARD_API_KEY_PLACEHOLDER) {
  return `const response = await fetch("${PUBLIC_API_BASE_URL}/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    route_policy: "auto",
    messages: [{ role: "user", content: "Draft a support reply." }]
  })
});

const data = await response.json();
console.log(data);`;
}

export function buildPythonExample(apiKey = DASHBOARD_API_KEY_PLACEHOLDER) {
  return `import requests

response = requests.post(
    "${PUBLIC_API_BASE_URL}/v1/chat/completions",
    headers={
        "Authorization": "Bearer ${apiKey}",
        "Content-Type": "application/json",
    },
    json={
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": "Create a short product summary."}],
        "stream": False,
    },
    timeout=60,
)

print(response.json())`;
}
