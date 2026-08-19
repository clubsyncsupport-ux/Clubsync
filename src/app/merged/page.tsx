import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Account Merged" };

export default async function MergedPage() {
  const authUser = await requireUser();
  const user = await db.user.findUniqueOrThrow({ where: { id: authUser.id } });
  const target = user.mergedIntoId ? await db.user.findUnique({ where: { id: user.mergedIntoId } }) : null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-0 px-6 text-center">
      <p className="text-4xl">🔗</p>
      <h1 className="mt-4 text-xl font-bold text-text-primary">This account has been merged</h1>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        Your clubs, service hours, and event history were moved into another account.
        {target && (
          <>
            {" "}
            Sign in with <span className="font-medium text-text-primary">{target.email}</span> instead.
          </>
        )}
      </p>
      <form action={logoutAction} className="mt-6">
        <button type="submit" className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-primary">
          Sign Out
        </button>
      </form>
    </div>
  );
}
