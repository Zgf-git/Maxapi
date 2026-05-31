export const FAQS = [
  {
    question: "What is MaxAPI and how does it work?",
    answer:
      "MaxAPI is an OpenAI-compatible API gateway for managed models and route policies. Instead of wiring each application directly to one upstream account or provider, you connect to MaxAPI. The gateway resolves your explicit model or route_policy, applies provider failover, and records billing and request logs in one place."
  },
  {
    question: "How is pricing calculated?",
    answer:
      "Pricing is usage-based per token using the pricing rules published for each public model or managed route. You top up a prepaid balance through the billing page, and each request deducts usage based on the executed provider/model and recorded token counts. There are no monthly subscriptions or minimums in this MVP."
  },
  {
    question: "Is the API compatible with OpenAI SDK?",
    answer:
      "Yes. MaxAPI uses the exact same request/response format as OpenAI's chat completions API. Just change the baseURL and API key — your existing code, LangChain apps, and AI agents work without any modification."
  },
  {
    question: "How do I add balance to my account?",
    answer:
      "Go to Dashboard → Billing → Top Up. Choose an amount, complete payment with any configured provider, and your balance is added after the provider confirms payment. New users receive $0.50 free credit upon signup. All transactions are recorded in your ledger."
  },
  {
    question: "What happens if an upstream provider or key fails?",
    answer:
      "MaxAPI monitors provider and key health in real-time. If an upstream key returns a 429 or 5xx error, it enters cooldown and the gateway retries against the next healthy path when your route policy allows fallback. You do not need to change client code to benefit from failover."
  },
  {
    question: "Can I see my usage history?",
    answer:
      "Yes. The Requests page shows every API call with model, token count, latency, and cost. The Usage tab displays aggregate statistics. You can also visit our public Status page to see real-time key pool health."
  }
] as const;
