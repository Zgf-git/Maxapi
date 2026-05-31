"use server";

import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/auth/password";
import { sendEmailVerificationEmail } from "@/lib/auth/verification";
import { authSchema } from "@/lib/auth/validation";
import { DEFAULT_PLAN } from "@/lib/plans/catalog";
import { createUniqueReferralCode, findUserByReferralCode } from "@/lib/referral/service";
import { canSelfSignup } from "@/lib/run-mode";

export type RegisterState = {
  success?: boolean;
  error?: string;
  previewUrl?: string | null;
};

export async function registerUser(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  if (!canSelfSignup()) {
    return { error: "Account creation is currently disabled." };
  }

  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name")
  });

  if (!parsed.success) {
    return { error: "Please provide a valid name, email, and password." };
  }

  const email = parsed.data.email.toLowerCase();

  const passwordHash = await hashPassword(parsed.data.password);

  const rawReferralCode = formData.get("referralCode");
  const referralCode =
    typeof rawReferralCode === "string" && rawReferralCode.trim().length > 0
      ? rawReferralCode.trim().toUpperCase()
      : null;

  let referredByUserId: string | undefined;
  if (referralCode) {
    const referrer = await findUserByReferralCode(referralCode);
    if (referrer) {
      referredByUserId = referrer.id;
    }
  }

  const newReferralCode = await createUniqueReferralCode();

  try {
    const user = await db.user.create({
      data: {
        email,
        emailVerifiedAt: env.AUTH_REQUIRE_EMAIL_VERIFICATION ? null : new Date(),
        passwordHash,
        name: parsed.data.name,
        plan: DEFAULT_PLAN,
        referralCode: newReferralCode,
        referredByUserId,
        userBalance: {
          create: {
            balanceUsdMicros: 500_000n
          }
        }
      }
    });

    if (env.AUTH_REQUIRE_EMAIL_VERIFICATION) {
      const delivery = await sendEmailVerificationEmail(user.id, user.email);
      return {
        success: true,
        previewUrl: delivery.previewUrl
      };
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "An account with this email already exists." };
    }

    throw error;
  }

  return { success: true };
}
