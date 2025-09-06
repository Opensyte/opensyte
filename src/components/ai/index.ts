// AI Summary Components
export { AISummaryCards } from "./dashboard/ai-summary-cards";

// AI Audit Components
export { AuditDashboard } from "./audit/audit-dashboard";

// AI Anomaly Components
export { AnomalyDashboard } from "./anomalies/anomaly-dashboard";

// AI Personalized Views Components
export { PersonalizedViews } from "./personalized-views/personalized-views";

// AI Shared Components
export {
  AISummaryCardsSkeleton,
  AuditDashboardSkeleton,
  AnomalyDashboardSkeleton,
  PersonalizedViewsSkeleton,
} from "./shared/ai-skeletons";

export {
  AIPermissionGuard,
  AIReadPermissionGuard,
  AIWritePermissionGuard,
  AIAdminPermissionGuard,
  withAIPermissions,
} from "./shared/ai-permission-guard";

// Re-export types for convenience
export type {
  AuditAnalysisResult,
  AnomalyDetectionResult,
  DocumentClassificationResult,
  ViewConfiguration,
  DashboardWidget,
} from "~/types/ai";
