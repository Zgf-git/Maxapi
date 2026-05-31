import { z } from "zod";

const optionalPositiveInt = z.preprocess((value) => {
  const text = String(value ?? "").trim();
  return text ? Number.parseInt(text, 10) : undefined;
}, z.number().int().positive().max(1_000_000).optional());

const optionalIsoDate = z.preprocess((value) => {
  const text = String(value ?? "").trim();
  return text ? new Date(text) : undefined;
}, z.date().optional());

export const createApiKeySchema = z.object({
  name: z.string().trim().min(2).max(64),
  requestsPerMinuteLimit: optionalPositiveInt,
  concurrentRequestsLimit: optionalPositiveInt,
  dailyRequestLimit: optionalPositiveInt,
  expiresAt: optionalIsoDate
});

export const revokeApiKeySchema = z.object({
  keyId: z.string().cuid()
});

export const updateApiKeyControlsSchema = z.object({
  keyId: z.string().cuid(),
  isEnabled: z.preprocess((value) => String(value ?? "") === "true", z.boolean()),
  requestsPerMinuteLimit: optionalPositiveInt,
  concurrentRequestsLimit: optionalPositiveInt,
  dailyRequestLimit: optionalPositiveInt,
  expiresAt: optionalIsoDate
});
