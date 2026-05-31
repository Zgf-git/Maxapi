import type { Metadata } from "next";
import { VerifyEmailRequestForm } from "@/components/auth/verify-email-request-form";

export const metadata: Metadata = {
  title: "Resend verification - MaxAPI",
  description: "Request a new verification email for your MaxAPI account."
};

export default function VerifyEmailRequestPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center px-4 py-12 lg:px-6">
      <VerifyEmailRequestForm />
    </main>
  );
}
