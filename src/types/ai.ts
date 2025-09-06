import { z } from "zod";

// AI Service Types
export interface TransactionData {
  id: string;
  type: string;
  amount: number;
  date: string;
  description?: string;
  vendor?: string;
}

export interface DocumentData {
  id: string;
  fileName: string;
  type: string;
  classification?: string;
}

export interface OrganizationData {
  id: string;
  name: string;
  industry?: string;
  users: number;
  revenue?: number;
  expenses?: number;
  customers?: number;
  projects?: number;
}

export interface UserActivityData {
  module: string;
  action: string;
  frequency: number;
  lastAccessed: Date;
}

// Document Classification
export const documentClassificationSchema = z.object({
  classification: z.enum([
    "RECEIPT",
    "INVOICE",
    "BANK_STATEMENT",
    "CONTRACT",
    "PURCHASE_ORDER",
    "PAYMENT_CONFIRMATION",
    "TAX_DOCUMENT",
    "EXPENSE_REPORT",
    "UNKNOWN",
  ]),
  confidence: z.number().min(0).max(1),
  extractedData: z
    .object({
      amount: z.number().optional(),
      currency: z.string().optional(),
      date: z.string().optional(),
      vendor: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
    })
    .optional(),
  linkedTransactions: z.array(z.string()).optional(),
});

export type DocumentClassificationResult = z.infer<
  typeof documentClassificationSchema
>;

// View Configuration
export const viewConfigurationSchema = z.object({
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

export type ViewConfiguration = z.infer<typeof viewConfigurationSchema>;

// Audit Analysis
export const auditAnalysisSchema = z.object({
  riskScore: z.number().min(0).max(100),
  anomalies: z.array(
    z.object({
      type: z.string(),
      description: z.string(),
      severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      affectedTransactions: z.array(z.string()),
      recommendation: z.string(),
    })
  ),
  completeness: z.object({
    documentationRate: z.number().min(0).max(100),
    missingDocuments: z.array(z.string()),
    recommendations: z.array(z.string()),
  }),
  summary: z.string(),
});

export type AuditAnalysisResult = z.infer<typeof auditAnalysisSchema>;

// Anomaly Detection
export const anomalySchema = z.object({
  anomalies: z.array(
    z.object({
      type: z.string(),
      description: z.string(),
      severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      items: z.array(z.string()),
    })
  ),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  summary: z.string(),
});

export type AnomalyDetectionResult = z.infer<typeof anomalySchema>;

// Role Insights
export const insightsSchema = z.object({
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

export type InsightsResult = z.infer<typeof insightsSchema>;

// Role Metrics
export const metricsSchema = z.object({
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

export type MetricsResult = z.infer<typeof metricsSchema>;

// AI Feature Status
export interface AIFeatureStatus {
  enabled: boolean;
  auditEngine: boolean;
  personalizedViews: boolean;
  documentClassification: boolean;
  anomalyDetection: boolean;
  smartInsights: boolean;
}

// Widget Types for UI
export interface MetricCardWidget {
  type: "metric_card";
  title: string;
  value: string | number;
  change?: {
    value: number;
    direction: "up" | "down" | "neutral";
    period: string;
  };
  format?: "currency" | "percentage" | "number";
  icon?: string;
  color?: "primary" | "success" | "warning" | "destructive";
}

export interface ChartWidget {
  type: "chart";
  title: string;
  chartType: "line" | "bar" | "pie" | "area";
  data: Array<Record<string, unknown>>;
  config?: Record<string, unknown>;
}

export interface TableWidget {
  type: "table";
  title: string;
  columns: Array<{
    key: string;
    label: string;
    sortable?: boolean;
    format?: "currency" | "date" | "number" | "text";
  }>;
  data: Array<Record<string, unknown>>;
  pagination?: boolean;
}

export interface AlertWidget {
  type: "alerts";
  title: string;
  alerts: Array<{
    id: string;
    type: "info" | "warning" | "error" | "success";
    title: string;
    message: string;
    timestamp: Date;
    dismissible: boolean;
  }>;
}

export interface QuickActionsWidget {
  type: "quick_actions";
  title: string;
  actions: Array<{
    id: string;
    label: string;
    icon: string;
    action: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
    disabled?: boolean;
  }>;
}

export interface RecentActivityWidget {
  type: "recent_activity";
  title: string;
  activities: Array<{
    id: string;
    user: string;
    action: string;
    target: string;
    timestamp: Date;
    icon?: string;
  }>;
}

export interface InsightsWidget {
  type: "insights";
  title: string;
  insights: Array<{
    id: string;
    type: "tip" | "warning" | "opportunity" | "trend";
    title: string;
    description: string;
    confidence: number;
    priority: "low" | "medium" | "high" | "critical";
    actionable: boolean;
    action?: string;
  }>;
}

export type DashboardWidget =
  | MetricCardWidget
  | ChartWidget
  | TableWidget
  | AlertWidget
  | QuickActionsWidget
  | RecentActivityWidget
  | InsightsWidget;

// Dashboard Layout
export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  widgets: Array<{
    id: string;
    widget: DashboardWidget;
    position: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
    minSize?: {
      w: number;
      h: number;
    };
    maxSize?: {
      w: number;
      h: number;
    };
  }>;
}

// Audit Types
export interface AuditPackage {
  id: string;
  name: string;
  description?: string;
  status:
    | "DRAFT"
    | "PROCESSING"
    | "REVIEW"
    | "COMPLETED"
    | "EXPORTED"
    | "ARCHIVED";
  dateRange: {
    start: Date;
    end: Date;
  };
  totalTransactions: number;
  totalDocuments: number;
  riskScore?: number;
  analysis?: AuditAnalysisResult;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  classification: string;
  confidence?: number;
  status: "PENDING" | "PROCESSING" | "CLASSIFIED" | "VERIFIED" | "REJECTED";
  extractedData?: Record<string, unknown>;
  linkedTransactions?: string[];
  processedAt?: Date;
  createdAt: Date;
}

// AI Insight Types
export interface AIInsight {
  id: string;
  type:
    | "ANOMALY_DETECTION"
    | "TREND_ANALYSIS"
    | "PREDICTION"
    | "RECOMMENDATION"
    | "ALERT"
    | "OPPORTUNITY";
  category: string;
  title: string;
  description: string;
  confidence: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "ACTIVE" | "DISMISSED" | "RESOLVED" | "EXPIRED";
  data: Record<string, unknown>;
  recommendations?: Array<{
    title: string;
    description: string;
    action: string;
  }>;
  createdAt: Date;
  expiresAt?: Date;
  dismissedAt?: Date;
}

// Personalized View Types
export interface PersonalizedView {
  id: string;
  viewType:
    | "FOUNDER_DASHBOARD"
    | "CFO_DASHBOARD"
    | "ACCOUNTANT_DASHBOARD"
    | "MANAGER_DASHBOARD"
    | "SALES_DASHBOARD"
    | "HR_DASHBOARD";
  configuration: ViewConfiguration;
  metrics?: Record<string, unknown>;
  insights?: Array<AIInsight>;
  lastUpdated: Date;
  isActive: boolean;
  preferences?: Record<string, unknown>;
}

// User Behavior Tracking
export interface UserBehavior {
  id: string;
  action: string;
  module: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  sessionId?: string;
}

// API Response Types
export interface AIRouterResponses {
  isEnabled: { enabled: boolean };
  classifyDocument: DocumentClassificationResult;
  generateAuditPackage: AuditPackage & { analysis?: AuditAnalysisResult };
  getPersonalizedView: PersonalizedView | null;
  generateInsights: {
    insights: AIInsight[];
    summary: string;
  };
  detectAnomalies: AnomalyDetectionResult;
  getInsights: AIInsight[];
  dismissInsight: AIInsight;
}

// AI Summary Types for Dashboard Cards
export interface AISummary {
  totalInsights: number;
  criticalAlerts: number;
  auditScore: number;
  anomaliesDetected: number;
  processingDocuments: number;
  personalizedViews: number;
  weeklyTrend: {
    insights: number;
    anomalies: number;
    auditScore: number;
  };
}

// Component Props Types
export interface AIInsightWidgetProps {
  organizationId: string;
  limit?: number;
  showDismissed?: boolean;
  onInsightDismiss?: (insightId: string) => void;
}

export interface AISummaryCardsProps {
  summary?: AISummary;
  isLoading: boolean;
  className?: string;
}

export interface AIMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
    period: string;
  };
  color?: "primary" | "success" | "warning" | "destructive";
  isLoading?: boolean;
}

export interface AuditDashboardProps {
  organizationId: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface AnomalyDashboardProps {
  organizationId: string;
  filterType?: "all" | "financial" | "hr" | "operational";
  severityFilter?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface InsightsDashboardProps {
  organizationId: string;
  viewType?: "all" | "recommendations" | "alerts" | "trends";
}

export interface PersonalizedViewsProps {
  organizationId: string;
  viewType: PersonalizedView["viewType"];
  editMode?: boolean;
  onSave?: (config: ViewConfiguration) => void;
}

export interface AuditPackageCardProps {
  auditPackage: AuditPackage;
  onView?: (id: string) => void;
  onExport?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export interface PersonalizedDashboardProps {
  organizationId: string;
  viewType: PersonalizedView["viewType"];
  onWidgetUpdate?: (
    widgetId: string,
    updates: Partial<DashboardWidget>
  ) => void;
}

export interface DocumentClassifierProps {
  onClassification?: (result: DocumentClassificationResult) => void;
  accept?: string;
  maxSize?: number;
}

export interface AnomalyDetectorProps {
  organizationId: string;
  dataType: "expenses" | "invoices" | "payments";
  onAnomalyDetected?: (anomalies: AnomalyDetectionResult) => void;
}

// AI Dialog Component Props
export interface AIInsightDialogProps {
  insight: AIInsight;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss?: (insightId: string) => void;
  onAction?: (action: string) => void;
}

export interface AuditPackageDialogProps {
  auditPackage?: AuditPackage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  mode: "create" | "edit" | "view";
  onSave?: (auditPackage: Partial<AuditPackage>) => void;
}

export interface PersonalizedViewDialogProps {
  view?: PersonalizedView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  viewType: PersonalizedView["viewType"];
  onSave?: (config: ViewConfiguration) => void;
}

// AI List Component Props
export interface AIInsightListProps {
  insights: AIInsight[];
  isLoading: boolean;
  onInsightClick?: (insight: AIInsight) => void;
  onDismiss?: (insightId: string) => void;
  showFilters?: boolean;
  className?: string;
}

export interface AuditPackageListProps {
  auditPackages: AuditPackage[];
  isLoading: boolean;
  onPackageClick?: (auditPackage: AuditPackage) => void;
  onCreateNew?: () => void;
  className?: string;
}

export interface AnomalyListProps {
  anomalies: Array<{
    id: string;
    type: string;
    description: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    items: string[];
    detectedAt: Date;
  }>;
  isLoading: boolean;
  onAnomalyClick?: (anomalyId: string) => void;
  severityFilter?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  onSeverityFilterChange?: (
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined
  ) => void;
  className?: string;
}

// AI Chart Component Props
export interface AITrendChartProps {
  data: Array<{
    date: string;
    insights: number;
    anomalies: number;
    auditScore: number;
  }>;
  isLoading: boolean;
  className?: string;
}

export interface RiskScoreChartProps {
  scores: Array<{
    category: string;
    score: number;
    maxScore: number;
    color: string;
  }>;
  isLoading: boolean;
  className?: string;
}

// Filter and Search Props
export interface AIFiltersProps {
  filters: {
    dateRange?: { start: Date; end: Date };
    type?: string[];
    severity?: ("LOW" | "MEDIUM" | "HIGH" | "CRITICAL")[];
    status?: string[];
  };
  onFiltersChange: (filters: AIFiltersProps["filters"]) => void;
  className?: string;
}

export interface AISearchProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}
