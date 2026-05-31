"use server";

import { AuthTokenType } from "@prisma/client";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/auth/password";
import { sendAuthActionEmail } from "@/lib/auth/email";
import { consumeAuthToken, issueAuthToken, revokeOutstandingTokens } from "@/lib/auth/tokens";

export type PasswordResetState = {
  success?: boolean;
  error?: string;
  previewUrl?: string | null;
};

export async function requestPasswordReset(
  _prevState: PasswordResetState,
  formData: FormData
): Promise<PasswordResetState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return { error: "Please enter your email." };
  }

  const user = await db.user.findUnique({
    where: { email }
  });

  if (!user) {
    return { success: true };
  }

  await revokeOutstandingTokens({
    userId: user.id,
    type: AuthTokenType.PASSWORD_RESET
  });

  const { rawToken } = await issueAuthToken({
    userId: user.id,
    email: user.email,
    type: AuthTokenType.PASSWORD_RESET
  });
  const actionUrl = `${env.APP_BASE_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const result = await sendAuthActionEmail({
    to: user.email,
    type: AuthTokenType.PASSWORD_RESET,
    actionUrl
  });

  return {
    success: true,
    previewUrl: result.previewUrl
  };
}

export async function resetPasswordWithToken(
  _prevState: PasswordResetState,
  formData: FormData
): Promise<PasswordResetState> {
  const tokenValue = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const token = await consumeAuthToken({
    rawToken: tokenValue,
    type: AuthTokenType.PASSWORD_RESET
  });

  if (!token) {
    return { error: "This password reset link is invalid or has expired." };
  }

  await db.user.update({
    where: { id: token.userId },
    data: {
      passwordHash: await hashPassword(password)
    }
  });

  await revokeOutstandingTokens({
    userId: token.userId,
    type: AuthTokenType.PASSWORD_RESET
  });

  return { success: true };
}
