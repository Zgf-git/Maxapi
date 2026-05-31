# E2E Tests

End-to-end tests using [Playwright](https://playwright.dev/) covering the golden path of MaxAPI.

## Prerequisites

1. **PostgreSQL database running** (required for the app to start)

   ```bash
   # Option A: Docker
   docker run -d --name maxapi-postgres \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=maxapi \
     -p 5432:5432 \
     postgres:16-alpine

   # Option B: Docker Compose (starts both DB and app)
   docker compose up -d db
   ```

2. **Database migrations applied**

   ```bash
   npx prisma migrate deploy
   ```

3. **Prisma Client generated**

   ```bash
   npx prisma generate
   ```

## Running Tests

```bash
# Run all E2E tests (auto-starts dev server)
npm run test:e2e

# Run with UI mode for debugging
npm run test:e2e:ui

# Run with debugger
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/auth.spec.ts

# Run only setup (creates test users and saves auth state)
npx playwright test --project=setup
```

## Test Structure

| File | Coverage | Auth |
|------|----------|------|
| `tests/auth.spec.ts` | Login, registration, unauthenticated redirects | Mixed |
| `tests/dashboard.spec.ts` | Dashboard stats, navigation | User |
| `tests/api-keys.spec.ts` | Create, configure, revoke API keys | User |
| `tests/api-usage.spec.ts` | API auth, request logs, model listing | User + API key |
| `tests/internal-admin.spec.ts` | Internal pages, RBAC | Admin + User |

## How It Works

1. **Global Setup** (`global-setup.ts`): Creates 3 test users (USER, ADMIN, OWNER) with $10.00 balance via Prisma
2. **Auth Setup** (`setup/auth.setup.ts`): Logs in each user via browser and saves session cookies to `e2e/.auth/*.json`
3. **Tests**: Reuse saved auth state — no re-login needed per test
4. **Global Teardown** (`global-teardown.ts`): Cleans up all test data from the database

## Test Users

| Role | Email | Password | Balance |
|------|-------|----------|---------|
| USER | `e2e-user@maxapi.test` | `TestPass123!` | $10.00 |
| ADMIN | `e2e-admin@maxapi.test` | `TestPass123!` | $10.00 |
| OWNER | `e2e-owner@maxapi.test` | `TestPass123!` | $10.00 |
