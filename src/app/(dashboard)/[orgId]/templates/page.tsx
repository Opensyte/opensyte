import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "~/lib/auth";
import { TemplatesGalleryClient } from "~/components/templates/templates-gallery-client";
import { TemplateBuilder } from "~/components/templates/template-builder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Package, Sparkles, Download, Settings } from "lucide-react";

export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                <Package className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Templates
                </h1>
                <p className="text-lg text-muted-foreground mt-1">
                  Discover, create, and manage template packages for your
                  organization
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full border">
                💡 Boost productivity with templates
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Tabs defaultValue="gallery" className="w-full">
          {/* Enhanced Tab Navigation */}
          <div className="mb-8">
            <TabsList className="w-full max-w-md mx-auto grid grid-cols-2 h-12 bg-muted p-1 rounded-xl">
              <TabsTrigger
                value="gallery"
                className="flex items-center justify-center gap-2 h-10 rounded-lg font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Template </span>Gallery
              </TabsTrigger>
              <TabsTrigger
                value="builder"
                className="flex items-center justify-center gap-2 h-10 rounded-lg font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Template </span>Builder
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Gallery Tab */}
          <TabsContent value="gallery" className="w-full">
            <TemplatesGalleryClient organizationId={orgId} />
          </TabsContent>

          {/* Builder Tab */}
          <TabsContent value="builder" className="w-full">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Settings className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Template Builder</h2>
                  <div className="ml-2">
                    <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                      ✨ Advanced
                    </span>
                  </div>
                </div>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Create custom template packages from your organization&apos;s
                  assets to share with other teams or organizations. Build once,
                  deploy everywhere.
                </p>
              </div>
              <TemplateBuilder organizationId={orgId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
