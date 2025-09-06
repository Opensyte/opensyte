import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { PERMISSIONS } from "~/lib/rbac";
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  Target,
  Clock,
  Filter,
} from "lucide-react";
import { formatDistance } from "date-fns";
import type { AIInsight } from "~/types/ai";

export default async function InsightsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  // Mock insights data - in real app, this would come from tRPC using orgId
  const mockInsights: AIInsight[] = [
    {
      id: "1",
      type: "TREND_ANALYSIS",
      category: "Finance",
      title: "Unusual expense pattern detected",
      description:
        "Office supplies expenses have increased by 40% this month compared to last month. This could indicate bulk purchasing or potential expense categorization issues.",
      confidence: 0.87,
      priority: "HIGH",
      status: "ACTIVE",
      data: {
        currentMonthAmount: 1400,
        previousMonthAmount: 1000,
        percentageChange: 40,
        affectedCategories: ["Office Supplies", "Printing"],
      },
      recommendations: [
        {
          title: "Review expense categories",
          description:
            "Verify that office supply expenses are correctly categorized",
          action: "review_categories",
        },
        {
          title: "Check for bulk purchases",
          description: "Determine if recent purchases were planned bulk orders",
          action: "verify_bulk_purchases",
        },
      ],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      id: "2",
      type: "RECOMMENDATION",
      category: "Operations",
      title: "Optimize recurring payments",
      description:
        "Analysis shows you could save $200/month by consolidating software subscriptions and negotiating annual payments instead of monthly.",
      confidence: 0.92,
      priority: "MEDIUM",
      status: "ACTIVE",
      data: {
        potentialSavings: 200,
        affectedSubscriptions: 8,
        subscriptionTypes: ["Software", "SaaS", "Cloud Services"],
      },
      recommendations: [
        {
          title: "Review subscriptions",
          description:
            "Audit all software subscriptions for duplicates and unnecessary services",
          action: "review_subscriptions",
        },
        {
          title: "Negotiate annual pricing",
          description:
            "Contact vendors to negotiate better rates for annual commitments",
          action: "negotiate_pricing",
        },
      ],
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    },
    {
      id: "3",
      type: "ALERT",
      category: "Finance",
      title: "Cash flow projection warning",
      description:
        "Based on current spending patterns and incoming revenue, cash flow may become negative in 6 weeks if no action is taken.",
      confidence: 0.78,
      priority: "CRITICAL",
      status: "ACTIVE",
      data: {
        projectedDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000), // 6 weeks
        currentBalance: 15000,
        projectedBalance: -2500,
        weeklyBurnRate: 2900,
      },
      recommendations: [
        {
          title: "Accelerate receivables",
          description:
            "Follow up on outstanding invoices and offer early payment discounts",
          action: "accelerate_receivables",
        },
        {
          title: "Reduce discretionary spending",
          description: "Temporarily reduce non-essential expenses",
          action: "reduce_spending",
        },
      ],
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    },
  ];

  const getInsightIcon = (type: AIInsight["type"]) => {
    switch (type) {
      case "ANOMALY_DETECTION":
        return AlertTriangle;
      case "TREND_ANALYSIS":
        return TrendingUp;
      case "PREDICTION":
        return Brain;
      case "RECOMMENDATION":
        return Target;
      case "ALERT":
        return AlertTriangle;
      case "OPPORTUNITY":
        return TrendingUp;
      default:
        return Brain;
    }
  };

  const getPriorityColor = (priority: AIInsight["priority"]) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "HIGH":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "LOW":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <ClientPermissionGuard
      requiredAnyPermissions={[
        PERMISSIONS.AI_READ,
        PERMISSIONS.AI_WRITE,
        PERMISSIONS.AI_ADMIN,
      ]}
    >
      <div className="p-4 sm:p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Smart Insights
              </h1>
              <p className="text-muted-foreground">
                AI-powered insights and recommendations for your business
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button size="sm">
                <Brain className="h-4 w-4 mr-2" />
                Generate Insights
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground tracking-wide">
                      Total Insights
                    </p>
                    <p className="text-2xl font-bold">{mockInsights.length}</p>
                  </div>
                  <Brain className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground tracking-wide">
                      Critical
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {
                        mockInsights.filter(i => i.priority === "CRITICAL")
                          .length
                      }
                    </p>
                  </div>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground tracking-wide">
                      Recommendations
                    </p>
                    <p className="text-2xl font-bold">
                      {
                        mockInsights.filter(i => i.type === "RECOMMENDATION")
                          .length
                      }
                    </p>
                  </div>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground tracking-wide">
                      Avg Confidence
                    </p>
                    <p className="text-2xl font-bold">
                      {Math.round(
                        (mockInsights.reduce(
                          (acc, insight) => acc + insight.confidence,
                          0
                        ) /
                          mockInsights.length) *
                          100
                      )}
                      %
                    </p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Insights List */}
          <div className="space-y-4">
            {mockInsights.map(insight => {
              const Icon = getInsightIcon(insight.type);

              return (
                <Card key={insight.id} className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <h3 className="text-lg font-semibold">
                            {insight.title}
                          </h3>
                          <p className="text-muted-foreground mt-1">
                            {insight.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(insight.priority)}>
                          {insight.priority}
                        </Badge>
                        <Badge variant="outline">
                          {Math.round(insight.confidence * 100)}% confidence
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDistance(
                          new Date(insight.createdAt),
                          new Date(),
                          {
                            addSuffix: true,
                          }
                        )}
                      </div>
                      <Badge variant="secondary">{insight.category}</Badge>
                      <Badge variant="secondary">
                        {insight.type.replace("_", " ")}
                      </Badge>
                    </div>

                    {insight.recommendations &&
                      insight.recommendations.length > 0 && (
                        <div className="border-t pt-4">
                          <h4 className="text-sm font-medium mb-3">
                            Recommendations:
                          </h4>
                          <div className="space-y-2">
                            {insight.recommendations.map((rec, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    {rec.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {rec.description}
                                  </p>
                                </div>
                                <Button size="sm" variant="outline">
                                  Take Action
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Dismiss
                        </Button>
                        <Button variant="ghost" size="sm">
                          Share
                        </Button>
                      </div>
                      <Button size="sm">View Details</Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </ClientPermissionGuard>
  );
}
