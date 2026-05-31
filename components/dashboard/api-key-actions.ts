"use server";

import { revalidatePath } from "next/cache";

import { createApiKey, revokeApiKey, updateApiKeyControls } from "@/lib/api-keys/service";
import { createApiKeySchema, revokeApiKeySchema, updateApiKeyControlsSchema } from "@/lib/api-keys/validation";
import { getActionUser } from "@/lib/auth/session";

export type CreateApiKeyResult =
  | { success: true; plaintextKey: string; keyPrefix: string; lastFour: string }
  | { success: false; error: string; code?: "UNAUTHORIZED" };

export async function createApiKeyAction(formData: FormData): Promise<CreateApiKeyResult> {
  const user = await getActionUser();

  if (!user) {
    return { success: false, error: "Please sign in to continue.", code: "UNAUTHORIZED" };
  }

  const parsed = createApiKeySchema.safeParse({
    name: formData.get("name"),
    requestsPerMinuteLimit: formData.get("requestsPerMinuteLimit"),
    concurrentRequestsLimit: formData.get("concurrentRequestsLimit"),
    dailyRequestLimit: formData.get("dailyRequestLimit"),
    expiresAt: formData.get("expiresAt")
  });

  if (!parsed.success) {
    return { success: false, error: "Please provide a key name between 2 and 64 characters." };
  }

  const result = await createApiKey(user.id, parsed.data.name, {
    requestsPerMinuteLimit: parsed.data.requestsPerMinuteLimit,
    concurrentRequestsLimit: parsed.data.concurrentRequestsLimit,
    dailyRequestLimit: parsed.data.dailyRequestLimit,
    expiresAt: parsed.data.expiresAt
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/api-keys");
  revalidatePath("/dashboard/quickstart");

  return {
    success: true,
    plaintextKey: result.plaintextKey,
    keyPrefix: result.keyPrefix,
    lastFour: result.lastFour
  };
}

export async function revokeApiKeyAction(formData: FormData) {
  const user = await getActionUser();

  if (!user) {
    return { ok: false as const, error: "Please sign in to continue.", code: "UNAUTHORIZED" as const };
  }

  const parsed = revokeApiKeySchema.safeParse({
    keyId: formData.get("keyId")
  });

  if (!parsed.success) {
    return { ok: false as const, error: "Invalid API key." };
  }

  const result = await revokeApiKey(user.id, parsed.data.keyId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/api-keys");

  return result;
}

export async function updateApiKeyControlsAction(formData: FormData) {
  const user = await getActionUser();

  if (!user) {
    return { ok: false as const, error: "Please sign in to continue.", code: "UNAUTHORIZED" as const };
  }

  const parsed = updateApiKeyControlsSchema.safeParse({
    keyId: formData.get("keyId"),
    isEnabled: formData.get("isEnabled"),
    requestsPerMinuteLimit: formData.get("requestsPerMinuteLimit"),
    concurrentRequestsLimit: formData.get("concurrentRequestsLimit"),
    dailyRequestLimit: formData.get("dailyRequestLimit"),
    expiresAt: formData.get("expiresAt")
  });

  if (!parsed.success) {
    return { ok: false as const, error: "Invalid API key controls." };
  }

  const result = await updateApiKeyControls(user.id, parsed.data.keyId, {
    isEnabled: parsed.data.isEnabled,
    requestsPerMinuteLimit: parsed.data.requestsPerMinuteLimit,
    concurrentRequestsLimit: parsed.data.concurrentRequestsLimit,
    dailyRequestLimit: parsed.data.dailyRequestLimit,
    expiresAt: parsed.data.expiresAt
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/api-keys");

  return result;
}
