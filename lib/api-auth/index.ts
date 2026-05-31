import { ApiKeyStatus } from "@prisma/client";

import { findApiKeyByHash, touchApiKeyLastUsed } from "@/lib/api-keys/service";

export type ApiAuthSuccess = {
  ok: true;
  apiKeyId: string;
  userId: string;
  keyName: string;
};

export type ApiAuthFailure = {
  ok: false;
  status: 401 | 403;
  code: "invalid_api_key" | "revoked_api_key" | "disabled_api_key" | "expired_api_key" | "unauthorized";
  message: string;
  apiKeyId?: string;
  userId?: string;
};

export type ApiAuthResult = ApiAuthSuccess | ApiAuthFailure;

function extractBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

function extractApiKey(
  authorizationHeader: string | null,
  xApiKeyHeader: string | null
) {
  const bearerToken = extractBearerToken(authorizationHeader);

  if (bearerToken) {
    return bearerToken;
  }

  const xApiKey = xApiKeyHeader?.trim();

  return xApiKey ? xApiKey : null;
}

export async function authenticateApiKey(
  authorizationHeader: string | null,
  xApiKeyHeader?: string | null
): Promise<ApiAuthResult> {
  const token = extractApiKey(authorizationHeader, xApiKeyHeader ?? null);

  if (!token) {
    return {
      ok: false,
      status: 401,
      code: "unauthorized",
      message: "Missing API key. Use Authorization: Bearer <key> or X-Api-Key."
    };
  }

  const apiKey = await findApiKeyByHash(token);

  if (!apiKey) {
    return {
      ok: false,
      status: 401,
      code: "invalid_api_key",
      message: "Invalid API key."
    };
  }

  const controlledApiKey = apiKey as typeof apiKey & {
    isEnabled?: boolean | null;
    expiresAt?: Date | null;
  };

  if (controlledApiKey.status === ApiKeyStatus.REVOKED) {
    return {
      ok: false,
      status: 403,
      code: "revoked_api_key",
      message: "This API key has been revoked.",
      apiKeyId: controlledApiKey.id,
      userId: controlledApiKey.userId
    };
  }

  if (controlledApiKey.isEnabled === false) {
    return {
      ok: false,
      status: 403,
      code: "disabled_api_key",
      message: "This API key is disabled.",
      apiKeyId: controlledApiKey.id,
      userId: controlledApiKey.userId
    };
  }

  if (controlledApiKey.expiresAt && controlledApiKey.expiresAt.getTime() <= Date.now()) {
    return {
      ok: false,
      status: 403,
      code: "expired_api_key",
      message: "This API key has expired.",
      apiKeyId: controlledApiKey.id,
      userId: controlledApiKey.userId
    };
  }

  return {
    ok: true,
    apiKeyId: controlledApiKey.id,
    userId: controlledApiKey.userId,
    keyName: controlledApiKey.name
  };
}

export async function markApiKeyAuthenticatedUsage(apiKeyId: string) {
  await touchApiKeyLastUsed(apiKeyId);
}
