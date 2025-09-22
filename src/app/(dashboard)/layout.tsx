import { headers } from "next/headers";
import { auth } from "~/lib/auth";
import { redirect } from "next/navigation";
import {
  checkUserEarlyAccess,
  isEarlyAccessEnabled,
  isAdminEmail,
} from "~/lib/early-access";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // First check authentication
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return redirect("/sign-in");

  // Check early access requirements based on ALLOW_EARLY_ACCESS environment variable
  if (isEarlyAccessEnabled()) {
    const accessStatus = await checkUserEarlyAccess();

    // Check if user is an admin (admins get automatic access to bypass early access)
    // Users listed in ADMIN_EMAILS environment variable can access the dashboard
    // without needing to register an early access code
    const userIsAdmin = session.user?.email
      ? isAdminEmail(session.user.email)
      : false;

    // If user doesn't have early access AND is not an admin, redirect to early access page
    if (!accessStatus.hasAccess && !userIsAdmin) {
      redirect("/early-access");
    }
  }

  // User is authenticated and has proper access, render the dashboard
  return <>{children}</>;
}
