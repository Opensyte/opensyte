"use client";

import { Brain, AlertTriangle, FileCheck, Eye, Zap } from "lucide-react";
import { AI_FEATURES } from "~/lib/ai/config";

interface AIFeatureStatusSummary {
  auditEngine: boolean;
  personalizedViews: boolean;
  documentClassification: boolean;
  anomalyDetection: boolean;
  smartInsights: boolean;
}

interface AISummaryCardsProps {
  summary?: AIFeatureStatusSummary;
  isLoading: boolean;
  className?: string;
}

export function AISummaryCards({
  summary,
  isLoading,
  className = "",
}: AISummaryCardsProps) {
  // Use real AI feature status from config
  const realSummary = summary ?? {
    auditEngine: AI_FEATURES.AUDIT_ENGINE,
    personalizedViews: AI_FEATURES.PERSONALIZED_VIEWS,
    documentClassification: AI_FEATURES.DOCUMENT_CLASSIFICATION,
    anomalyDetection: AI_FEATURES.ANOMALY_DETECTION,
    smartInsights: AI_FEATURES.SMART_INSIGHTS,
  };

  if (isLoading) {
    return (
      <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-5 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-md border bg-muted/30 p-3 flex items-start justify-between animate-pulse"
          >
            <div>
              <div className="h-3 w-12 bg-muted rounded mb-2"></div>
              <div className="h-6 w-8 bg-muted rounded"></div>
            </div>
            <div className="h-4 w-4 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: "Audit Engine",
      value: realSummary.auditEngine ? "Enabled" : "Disabled",
      icon: FileCheck,
      subtitle: "Document & transaction analysis",
      color: realSummary.auditEngine ? "text-green-600" : "text-gray-500",
    },
    {
      label: "Document Classification",
      value: realSummary.documentClassification ? "Enabled" : "Disabled",
      icon: Brain,
      subtitle: "AI document processing",
      color: realSummary.documentClassification
        ? "text-green-600"
        : "text-gray-500",
    },
    {
      label: "Anomaly Detection",
      value: realSummary.anomalyDetection ? "Enabled" : "Disabled",
      icon: Zap,
      subtitle: "Pattern analysis",
      color: realSummary.anomalyDetection ? "text-green-600" : "text-gray-500",
    },
    {
      label: "Smart Insights",
      value: realSummary.smartInsights ? "Enabled" : "Disabled",
      icon: AlertTriangle,
      subtitle: "AI recommendations",
      color: realSummary.smartInsights ? "text-green-600" : "text-gray-500",
    },
    {
      label: "Personalized Views",
      value: realSummary.personalizedViews ? "Enabled" : "Disabled",
      icon: Eye,
      subtitle: "Custom dashboards",
      color: realSummary.personalizedViews ? "text-green-600" : "text-gray-500",
    },
  ];

  return (
    <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-5 ${className}`}>
      {items.map(item => {
        const Icon = item.icon;

        return (
          <div
            key={item.label}
            className="rounded-md border bg-muted/30 p-3 flex items-start justify-between"
          >
            <div>
              <p className="text-xs font-medium text-muted-foreground tracking-wide">
                {item.label}
              </p>
              <p className={`mt-1 text-sm font-semibold ${item.color}`}>
                {item.value}
              </p>
              {item.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">
                  {item.subtitle}
                </p>
              )}
            </div>
            <Icon className={`h-4 w-4 ${item.color}`} />
          </div>
        );
      })}
    </div>
  );
}
