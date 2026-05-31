"use server";

import { AuthTokenType } from "@prisma/client";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendAuthActionEmail } from "@/lib/auth/email";
import { consumeAuthToken, issueAuthToken, revokeOutstandingTokens } from "@/lib/auth/tokens";

export type AuthEmailState = {
  success?: boolean;
  error?: string;
  previewUrl?: string | null;
};

export async function sendEmailVerificationEmail(userId: string, email: string) {
  await revokeOutstandingTokens({
    userId,
    type: AuthTokenType.EMAIL_VERIFICATION
  });

  const { rawToken } = await issueAuthToken({
    userId,
    email,
    type: AuthTokenType.EMAIL_VERIFICATION
  });
  const actionUrl = `${env.APP_BASE_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;

  return sendAuthActionEmail({
    to: email,
    type: AuthTokenType.EMAIL_VERIFICATION,
    actionUrl
  });
}

export async function requestEmailVerification(
  _prevState: AuthEmailState,
  formData: FormData
): Promise<AuthEmailState> {
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

  if (user.emailVerifiedAt) {
    return { success: true };
  }

  const result = await sendEmailVerificationEmail(user.id, user.email);
  return {
    success: true,
    previewUrl: result.previewUrl
  };
}

export async function verifyEmailToken(rawToken: string) {
  const token = await consumeAuthToken({
    rawToken,
    type: AuthTokenType.EMAIL_VERIFICATION
  });

  if (!token) {
    return {
      ok: false as const,
      error: "This verification link is invalid or has expired."
    };
  }

  await db.user.update({
    where: {
      id: token.userId
    },
    data: {
      emailVerifiedAt: new Date()
    }
  });

  return {
    ok: true as const,
    email: token.email
  };
}
