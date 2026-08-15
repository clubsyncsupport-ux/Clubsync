import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveLandingPath } from "@/lib/viewer";

export default async function RootPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/welcome");
  redirect(await resolveLandingPath(authUser.id));
}
