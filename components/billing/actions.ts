"use server";

import { revalidatePath } from "next/cache";

import { getActionUser } from "@/lib/auth/session";
import { grantDeveloperCredit } from "@/lib/billing/dashboard";

export async function grantDeveloperCreditAction() {
  const user = await getActionUser();

  if (!user) {
    return {
      ok: false as const,
      error: "Please sign in to continue."
    };
  }

  const result = await grantDeveloperCredit(user.id);

  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/billing");
  }

  return result;
}
