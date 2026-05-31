import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { verifyEmailToken } from "@/lib/auth/verification";

export const metadata: Metadata = {
  title: "Verify email - MaxAPI",
  description: "Verify your MaxAPI account email."
};

export default async function VerifyEmailPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailToken(token) : { ok: false as const, error: "Missing verification token." };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center px-4 py-12 lg:px-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{result.ok ? "Email verified" : "Verification failed"}</CardTitle>
          <CardDescription>{result.ok ? "Your email is now verified." : result.error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/sign-in">Return to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
