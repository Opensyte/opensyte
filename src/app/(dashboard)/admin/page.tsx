import { AdminDashboard } from "~/components/admin/admin-dashboard";
import { redirect } from "next/navigation";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { isAdminEmail, isEarlyAccessEnabled } from "~/lib/early-access";

export default async function AdminDashboardPage() {
  // Check if early access is enabled (admin features only available during early access)
  if (!isEarlyAccessEnabled()) {
    redirect("/dashboard");
  }

  // Check if user is authenticated and is an admin
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    redirect("/dashboard");
  }

  return <AdminDashboard />;
}
