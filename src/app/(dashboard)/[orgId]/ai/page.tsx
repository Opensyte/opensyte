import { AISummaryCards } from "~/components/ai/dashboard/ai-summary-cards";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Brain, FileCheck, Zap, Eye } from "lucide-react";
import Link from "next/link";

export default async function AIPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <ClientPermissionGuard
      requiredAnyPermissions={[
        PERMISSIONS.AI_READ,
        PERMISSIONS.AI_WRITE,
        PERMISSIONS.AI_ADMIN,
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">AI Features</h1>
          <p className="text-muted-foreground">
            Harness the power of AI to analyze your business data and gain
            insights
          </p>
        </div>

        <AISummaryCards isLoading={false} />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Audit Engine
              </CardTitle>
              <CardDescription>
                AI-powered document classification and audit analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Upload financial documents for automatic classification and
                comprehensive audit analysis.
              </p>
              <Link href={`/${orgId}/ai/audit`}>
                <Button size="sm" className="w-full">
                  Launch Audit Engine
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Anomaly Detection
              </CardTitle>
              <CardDescription>
                Detect unusual patterns and potential issues in your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                AI algorithms scan your financial data to identify anomalies and
                suspicious patterns.
              </p>
              <Link href={`/${orgId}/ai/anomalies`}>
                <Button size="sm" className="w-full">
                  View Anomalies
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Personalized Views
              </CardTitle>
              <CardDescription>
                AI-generated dashboards tailored to your role
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Get custom dashboard configurations and insights based on your
                role and activity patterns.
              </p>
              <Link href={`/${orgId}/ai/views`}>
                <Button size="sm" className="w-full">
                  Create Views
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Getting Started with AI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">1. Upload Documents</h4>
                <p className="text-sm text-muted-foreground">
                  Start by uploading your financial documents to the Audit
                  Engine for automatic classification.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">2. Run Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  Generate comprehensive audit reports and detect anomalies in
                  your financial data.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">3. Create Custom Views</h4>
                <p className="text-sm text-muted-foreground">
                  Generate personalized dashboards based on your role and
                  business needs.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">4. Monitor & Act</h4>
                <p className="text-sm text-muted-foreground">
                  Review AI-generated insights and recommendations to improve
                  your business operations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientPermissionGuard>
  );
}
