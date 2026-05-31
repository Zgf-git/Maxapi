import type { Metadata } from "next";
import { PasswordResetRequestForm } from "@/components/auth/password-reset-request-form";

export const metadata: Metadata = {
  title: "Forgot password - MaxAPI",
  description: "Request a password reset link for your MaxAPI account."
};

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center px-4 py-12 lg:px-6">
      <PasswordResetRequestForm />
    </main>
  );
}
