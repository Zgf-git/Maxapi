import { CodeBlock } from "@/components/shared/code-block";
import {
  buildCurlExplicitModelExample,
  buildCurlRoutePolicyExample,
  buildJavaScriptExample,
  buildPythonExample
} from "@/lib/quickstart/examples";

export function QuickstartExamples({ apiKey }: { apiKey?: string }) {
  return (
    <div className="space-y-6">
      <CodeBlock code={buildCurlRoutePolicyExample(apiKey)} language="bash" title="cURL: route policy" />
      <CodeBlock code={buildCurlExplicitModelExample(apiKey)} language="bash" title="cURL: explicit model" />
      <div className="grid gap-6 lg:grid-cols-2">
        <CodeBlock code={buildJavaScriptExample(apiKey)} language="javascript" title="JavaScript: fetch" />
        <CodeBlock code={buildPythonExample(apiKey)} language="python" title="Python: requests" />
      </div>
    </div>
  );
}
