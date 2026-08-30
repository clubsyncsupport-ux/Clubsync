import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Reset Password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col bg-surface-0 px-6 py-10">
      <div className="mx-auto w-full max-w-sm flex-1 animate-fade-in">
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-text-primary">Choose a new password</h1>
        <p className="mt-1 text-[15px] text-text-secondary">Make it something you&rsquo;ll remember.</p>

        {token ? <ResetPasswordForm token={token} /> : <p className="mt-6 text-sm text-danger">Missing reset token — use the link from your reset request.</p>}
      </div>
    </div>
  );
}
