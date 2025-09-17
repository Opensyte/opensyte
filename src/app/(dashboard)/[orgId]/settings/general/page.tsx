import { GeneralSettingsClient } from "~/components/settings/general-settings-client";
import { SettingsPermissionWrapper } from "~/components/shared/wrappers/settings-permission-wrapper";
import { Suspense } from "react";
import { Settings, Building2 } from "lucide-react";

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  return (
    <SettingsPermissionWrapper>
      <div className="max-w-7xl mx-auto space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground">
                Manage your organization configuration and preferences
              </p>
            </div>
          </div>
        </div>

        {/* Organization Settings Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Organization</h2>
          </div>
          <Suspense>
            <GeneralSettingsClient />
          </Suspense>
        </section>
      </div>
    </SettingsPermissionWrapper>
  );
}
