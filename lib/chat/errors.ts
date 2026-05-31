export type ApiRouteErrorKind =
  | "retryable_upstream_error"
  | "non_retryable_upstream_error"
  | "no_route_target"
  | "unsupported_model";

export class ApiRouteError extends Error {
  logged?: boolean;

  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly kind?: ApiRouteErrorKind
  ) {
    super(message);
    this.name = "ApiRouteError";
  }
}

export function sanitizeErrorMessage(message: string | null | undefined) {
  if (!message) {
    return null;
  }

  const normalized = message
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .replace(/\b(?:sk|mk|rk|pk|whsec)_[A-Za-z0-9_-]+\b/g, "[redacted-key]")
    .replace(/\btest-[A-Za-z0-9._-]{6,}\b/gi, "[redacted-key]");

  if (/incorrect api key provided|invalid api key|api key provided/i.test(normalized)) {
    return "Upstream provider authentication failed.";
  }

  return normalized.slice(0, 500);
}

export function markErrorLogged<T extends Error>(error: T) {
  (error as T & { logged: boolean }).logged = true;
  return error;
}

export function isRetryableUpstreamError(error: unknown) {
  return error instanceof ApiRouteError && error.kind === "retryable_upstream_error";
}
