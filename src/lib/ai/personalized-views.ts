import { generateObject } from "ai";
import { z } from "zod";
import { getAIModel, isAIEnabled } from "./config";
import type { UserRole } from "@prisma/client";

// Types for personalized views
interface OrganizationData {
  id: string;
  name: string;
  industry?: string;
  users: number;
  revenue?: number;
  expenses?: number;
  customers?: number;
  projects?: number;
}

interface UserActivityData {
  module: string;
  action: string;
  frequency: number;
  lastAccessed: Date;
}

// View Configuration Schema
const viewConfigurationSchema = z.object({
  widgets: z.array(
    z.object({
      type: z.enum([
        "metric_card",
        "chart",
        "table",
        "alerts",
        "quick_actions",
        "recent_activity",
        "insights",
      ]),
      title: z.string(),
      priority: z.number().min(1).max(10),
      size: z.enum(["small", "medium", "large", "full"]),
      data: z.record(z.unknown()),
      position: z.object({
        row: z.number(),
        col: z.number(),
        width: z.number(),
        height: z.number(),
      }),
    })
  ),
  metrics: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      format: z.enum(["currency", "percentage", "number", "date"]),
      source: z.string(),
      calculation: z.string(),
    })
  ),
  insights: z.array(
    z.object({
      type: z.enum(["alert", "recommendation", "trend", "opportunity"]),
      title: z.string(),
      description: z.string(),
      priority: z.enum(["low", "medium", "high", "critical"]),
      actionable: z.boolean(),
      action: z.string().optional(),
    })
  ),
  quickActions: z.array(
    z.object({
      label: z.string(),
      action: z.string(),
      icon: z.string(),
      enabled: z.boolean(),
    })
  ),
});

type ViewConfiguration = z.infer<typeof viewConfigurationSchema>;

// Generate personalized view configuration
export async function generatePersonalizedView(
  userRole: UserRole,
  organizationData: OrganizationData,
  userActivity: UserActivityData[]
): Promise<ViewConfiguration> {
  if (!isAIEnabled()) {
    return getDefaultViewForRole(userRole);
  }

  try {
    const result = await generateObject({
      model: getAIModel(),
      temperature: 0.3,
      schema: viewConfigurationSchema,
      prompt: `
        Generate a personalized dashboard configuration for a ${userRole} user.
        
        Organization Context:
        - Name: ${organizationData.name}
        - Industry: ${organizationData.industry ?? "Unknown"}
        - Team Size: ${organizationData.users} users
        - Revenue: $${organizationData.revenue ?? 0}
        - Expenses: $${organizationData.expenses ?? 0}
        - Customers: ${organizationData.customers ?? 0}
        - Projects: ${organizationData.projects ?? 0}
        
        User Activity Pattern:
        ${userActivity
          .slice(0, 10)
          .map(
            a =>
              `- ${a.module}.${a.action}: ${a.frequency} times (last: ${a.lastAccessed.toISOString()})`
          )
          .join("\n")}
        
        Create a dashboard optimized for this ${userRole} with:
        
        For ORGANIZATION_OWNER/SUPER_ADMIN:
        - High-level KPIs (revenue, growth, team performance)
        - Strategic alerts and opportunities
        - Cross-functional insights
        - Executive summary widgets
        
        For FINANCE_MANAGER:
        - Cash flow and budget tracking
        - Expense analysis and approvals
        - Financial forecasting
        - Audit and compliance status
        
        For SALES_MANAGER:
        - Sales pipeline and conversion rates
        - Customer acquisition metrics
        - Revenue forecasting
        - Team performance tracking
        
        For HR_MANAGER:
        - Employee metrics and engagement
        - Payroll and benefits tracking
        - Recruitment pipeline
        - Performance review status
        
        For PROJECT_MANAGER:
        - Project status and timeline tracking
        - Resource allocation and utilization
        - Budget vs actual analysis
        - Team productivity metrics
        
        For EMPLOYEE/CONTRACTOR/VIEWER:
        - Personal task and project status
        - Time tracking and submissions
        - Relevant notifications
        - Simple navigation
        
        Prioritize widgets based on role importance and user activity patterns.
        Include actionable insights and quick actions relevant to the role.
      `,
    });

    return result.object;
  } catch (error) {
    console.error("Failed to generate personalized view:", error);
    return getDefaultViewForRole(userRole);
  }
}

// Generate role-specific insights
export async function generateRoleInsights(
  userRole: UserRole,
  organizationData: OrganizationData,
  financialData: Record<string, unknown>
) {
  if (!isAIEnabled()) {
    return { insights: [], recommendations: [], summary: "AI disabled" };
  }

  const insightsSchema = z.object({
    insights: z.array(
      z.object({
        type: z.enum(["alert", "opportunity", "trend", "prediction"]),
        title: z.string(),
        description: z.string(),
        confidence: z.number().min(0).max(1),
        priority: z.enum(["low", "medium", "high", "critical"]),
        data: z.record(z.unknown()),
      })
    ),
    recommendations: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        impact: z.enum(["low", "medium", "high"]),
        effort: z.enum(["low", "medium", "high"]),
        category: z.string(),
        action: z.string(),
      })
    ),
    summary: z.string(),
  });

  try {
    const result = await generateObject({
      model: getAIModel(),
      temperature: 0.2,
      schema: insightsSchema,
      prompt: `
        Generate AI insights for a ${userRole} in this organization:
        
        Organization: ${organizationData.name} (${organizationData.industry})
        Financial Data: ${JSON.stringify(financialData, null, 2).substring(0, 1000)}
        
        Generate role-specific insights:
        
        For Financial Roles:
        - Cash flow analysis and predictions
        - Budget variance alerts
        - Cost optimization opportunities
        - Revenue growth insights
        
        For Leadership Roles:
        - Strategic growth opportunities
        - Resource allocation recommendations
        - Performance trend analysis
        - Risk assessments
        
        For Operational Roles:
        - Process efficiency improvements
        - Team productivity insights
        - Task and project optimization
        - Resource needs prediction
        
        Provide actionable recommendations with clear impact and effort assessments.
        Focus on insights that are immediately relevant to the ${userRole} role.
      `,
    });

    return result.object;
  } catch (error) {
    console.error("Failed to generate role insights:", error);
    return {
      insights: [],
      recommendations: [],
      summary: "AI insights generation failed",
    };
  }
}

// Calculate role-specific metrics
export async function calculateRoleMetrics(
  userRole: UserRole,
  rawData: Record<string, unknown>[]
) {
  if (!isAIEnabled()) {
    return getDefaultMetricsForRole(userRole);
  }

  const metricsSchema = z.object({
    kpis: z.array(
      z.object({
        name: z.string(),
        value: z.number(),
        unit: z.string(),
        trend: z.enum(["up", "down", "stable"]),
        change: z.number(),
        significance: z.enum(["low", "medium", "high"]),
      })
    ),
    calculated: z.record(z.number()),
    analysis: z.string(),
  });

  try {
    const result = await generateObject({
      model: getAIModel(),
      temperature: 0.1,
      schema: metricsSchema,
      prompt: `
        Calculate role-specific metrics for a ${userRole} from this data:
        
        ${JSON.stringify(rawData.slice(0, 50), null, 2)}
        
        For ${userRole}, focus on metrics like:
        
        ORGANIZATION_OWNER/SUPER_ADMIN:
        - Monthly Recurring Revenue (MRR)
        - Customer Acquisition Cost (CAC)
        - Lifetime Value (LTV)
        - Employee productivity
        - Profit margins
        
        FINANCE_MANAGER:
        - Cash flow ratio
        - Burn rate
        - Budget variance
        - Days Sales Outstanding (DSO)
        - Expense ratios
        
        SALES_MANAGER:
        - Conversion rates
        - Sales velocity
        - Pipeline value
        - Deal win rate
        - Average deal size
        
        HR_MANAGER:
        - Employee turnover
        - Time to hire
        - Employee satisfaction
        - Training completion rates
        - Compensation ratios
        
        PROJECT_MANAGER:
        - Project completion rate
        - Budget utilization
        - Resource utilization
        - Timeline adherence
        - Quality metrics
        
        Calculate actual values, trends, and provide analysis.
      `,
    });

    return result.object;
  } catch (error) {
    console.error("Failed to calculate role metrics:", error);
    return getDefaultMetricsForRole(userRole);
  }
}

// Default configurations for when AI is disabled
function getDefaultViewForRole(userRole: UserRole): ViewConfiguration {
  const commonWidgets = [
    {
      type: "recent_activity" as const,
      title: "Recent Activity",
      priority: 5,
      size: "medium" as const,
      data: {},
      position: { row: 1, col: 1, width: 6, height: 4 },
    },
    {
      type: "quick_actions" as const,
      title: "Quick Actions",
      priority: 6,
      size: "small" as const,
      data: {},
      position: { row: 1, col: 7, width: 6, height: 2 },
    },
  ];

  const roleSpecificWidgets = getRoleSpecificWidgets(userRole);

  return {
    widgets: [...roleSpecificWidgets, ...commonWidgets],
    metrics: getDefaultMetricsDefinitions(userRole),
    insights: [],
    quickActions: getDefaultQuickActions(userRole),
  };
}

function getRoleSpecificWidgets(userRole: UserRole) {
  switch (userRole) {
    case "ORGANIZATION_OWNER":
    case "SUPER_ADMIN":
      return [
        {
          type: "metric_card" as const,
          title: "Revenue Overview",
          priority: 1,
          size: "large" as const,
          data: {},
          position: { row: 0, col: 0, width: 8, height: 3 },
        },
        {
          type: "chart" as const,
          title: "Growth Metrics",
          priority: 2,
          size: "large" as const,
          data: {},
          position: { row: 0, col: 8, width: 4, height: 3 },
        },
      ];

    case "FINANCE_MANAGER":
      return [
        {
          type: "metric_card" as const,
          title: "Cash Flow",
          priority: 1,
          size: "medium" as const,
          data: {},
          position: { row: 0, col: 0, width: 6, height: 3 },
        },
        {
          type: "table" as const,
          title: "Pending Approvals",
          priority: 2,
          size: "medium" as const,
          data: {},
          position: { row: 0, col: 6, width: 6, height: 3 },
        },
      ];

    default:
      return [
        {
          type: "metric_card" as const,
          title: "Overview",
          priority: 1,
          size: "large" as const,
          data: {},
          position: { row: 0, col: 0, width: 12, height: 3 },
        },
      ];
  }
}

function getDefaultMetricsDefinitions(_userRole: UserRole) {
  return [
    {
      key: "total_revenue",
      label: "Total Revenue",
      format: "currency" as const,
      source: "invoices",
      calculation: "sum(amount)",
    },
    {
      key: "active_projects",
      label: "Active Projects",
      format: "number" as const,
      source: "projects",
      calculation: "count(status='active')",
    },
  ];
}

function getDefaultQuickActions(userRole: UserRole) {
  const commonActions = [
    {
      label: "View Reports",
      action: "navigate:/reports",
      icon: "BarChart3",
      enabled: true,
    },
  ];

  switch (userRole) {
    case "FINANCE_MANAGER":
      return [
        {
          label: "Create Invoice",
          action: "navigate:/invoices/new",
          icon: "FileText",
          enabled: true,
        },
        {
          label: "Expense Reports",
          action: "navigate:/expenses",
          icon: "Receipt",
          enabled: true,
        },
        ...commonActions,
      ];

    default:
      return commonActions;
  }
}

function getDefaultMetricsForRole(_userRole: UserRole) {
  return {
    kpis: [],
    calculated: {},
    analysis: "AI metrics calculation is disabled",
  };
}
