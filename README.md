# MaxAPI

**AI API 统一网关** — 提供 OpenAI-compatible 接口，支持多供应商路由、用量计费、API Key 管理，可部署为 SaaS 平台或内部自研网关。

## Features

- **OpenAI-compatible API** — 零成本迁移，改 baseURL 和 API Key 即可
- **多供应商路由** — OpenAI / OpenRouter / DeepSeek / Gemini / APIMart，支持 Key Pool 轮询
- **智能路由策略** — `cheap` / `balanced` / `premium` / `auto` 四档策略
- **用量计费** — 基于 token 的精确计费，余额预扣，审计日志
- **支付集成** — PayPal / 支付宝 / 微信支付
- **双模式运行** — `saas` 多租户模式 或 `simple` 内部网关模式
- **管理后台** — 用户管理、财务看板、运营监控、风控事件
- **Docker 一键部署** — 含 PostgreSQL + Redis + Nginx 完整编排

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your local env file:

```bash
cp .env.example .env.local
```

3. Update `DATABASE_URL`, `AUTH_SECRET`, `API_KEY_PEPPER`, `APP_BASE_URL`, and `OPENAI_API_KEY`.
   Set `APP_RUN_MODE=saas` for the full hosted product flow, or `APP_RUN_MODE=simple` for an internal/self-use gateway mode.
   `simple` mode disables self-signup, billing surfaces, referrals, and public pricing navigation.
   Set `ENABLE_SELF_SIGNUP=true` only if public self-registration should be enabled in `saas` mode.
   `MIN_REQUEST_BALANCE_USD_MICROS` controls the minimum balance required before a request can start.
   Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` if you want shared login throttling outside local memory.
   `OPENAI_BASE_URL` defaults to `https://api.openai.com/v1`.
   PayPal, Alipay, and WeChat variables are optional unless you enable self-serve top-ups.

4. Generate Prisma client and run the initial migration:

```bash
npx prisma migrate dev --name init
```

5. Start the app:

```bash
npm run dev
```

6. Credit a local user balance after registering:

```bash
npm run balance:credit -- user@example.com 10000000
```

7. Create an admin user when needed:

```bash
npm run create-admin -- user@example.com strong-password Admin
```

## Notes

- Authentication uses Auth.js credentials with a Prisma-backed `User` table.
- `APP_RUN_MODE=simple` turns MaxAPI into an operator-facing gateway without public commercial surfaces.
- API keys are generated securely, shown once, and stored only as HMAC-SHA256 hashes with a dedicated `API_KEY_PEPPER`.
- Revoked keys remain visible in the dashboard and are excluded from future verification.
- Sign-in attempts are throttled with a small rate-limiter abstraction and a memory fallback for local development.
- `POST /v1/chat/completions` accepts an OpenAI-compatible subset, authenticates with your own API keys, supports explicit models or `route_policy` (`cheap`, `balanced`, `premium`, `auto`), and routes through your configured OpenAI-compatible upstream key pool.
- Billing uses integer USD micros, versioned provider pricing rules, a usage ledger, and an auditable balance transaction journal.

## Internal console

Admin and ops pages have moved from `/dashboard/admin` and `/dashboard/ops` to a dedicated `/internal/*` route tree:

- `/internal` — Overview (MAU, requests, revenue, error rate, action queue)
- `/internal/users` — User list with search, filters, and pagination
- `/internal/users/[id]` — User detail (profile, balance, activity, cases, audit, keys)
- `/internal/finance/revenue` — Revenue / cost / margin charts
- `/internal/finance/top-ups` — Recharge orders
- `/internal/finance/cases` — Refund / compensation / adjustment case queue
- `/internal/finance/providers` — PayPal / Alipay / WeChat instance config
- `/internal/operations` — Live ops dashboard (requests, error rate, latency)
- `/internal/operations/pending` — Pending usage queue
- `/internal/operations/failures` — Failed requests
- `/internal/operations/abuse` — Abuse events
- `/internal/routing/providers` — Upstream API keys
- `/internal/routing/policies` — Route policy targets
- `/internal/growth/codes` — Redemption codes
- `/internal/growth/announcements` — System announcements
- `/internal/growth/referrals` — Referral commissions
- `/internal/audit` — Audit log
- `/internal/settings` — Internal members and env flags

Access requires a user role of `SUPPORT`, `OPS`, `ADMIN`, `OWNER`, or `AUDITOR`.
