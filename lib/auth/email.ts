import { AuthTokenType } from "@prisma/client";

import { env } from "@/lib/env";

function subjectForToken(type: AuthTokenType) {
  return type === AuthTokenType.EMAIL_VERIFICATION
    ? "Verify your MaxAPI email"
    : "Reset your MaxAPI password";
}

function bodyForToken(input: {
  type: AuthTokenType;
  actionUrl: string;
}) {
  if (input.type === AuthTokenType.EMAIL_VERIFICATION) {
    return `Open this link to verify your MaxAPI email:\n\n${input.actionUrl}\n`;
  }

  return `Open this link to reset your MaxAPI password:\n\n${input.actionUrl}\n`;
}

export async function sendAuthActionEmail(input: {
  to: string;
  type: AuthTokenType;
  actionUrl: string;
}) {
  if (!env.RESEND_API_KEY || !env.AUTH_EMAIL_FROM) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Email service is not configured. Set RESEND_API_KEY and AUTH_EMAIL_FROM to send emails in production."
      );
    }

    console.log(`[auth-email:${input.type}] ${input.to} -> ${input.actionUrl}`);
    return {
      delivered: false as const,
      previewUrl: input.actionUrl
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.AUTH_EMAIL_FROM,
      to: [input.to],
      subject: subjectForToken(input.type),
      text: bodyForToken({
        type: input.type,
        actionUrl: input.actionUrl
      })
    })
  });

  if (!response.ok) {
    throw new Error("Failed to dispatch authentication email.");
  }

  return {
    delivered: true as const,
    previewUrl: null
  };
}
