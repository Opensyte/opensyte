"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Shield,
  FileCheck,
  AlertTriangle,
  TrendingUp,
  Upload,
  MoreHorizontal,
} from "lucide-react";
import { formatDistance } from "date-fns";
import { useState } from "react";
import type {
  DocumentClassificationResult,
  AuditAnalysisResult,
} from "~/types/ai";

interface DocumentItem {
  id: string;
  name: string;
  uploadedAt: Date;
  classification?: DocumentClassificationResult;
  status: "PENDING" | "CLASSIFIED" | "ANALYZED" | "ERROR";
}

interface AuditDashboardProps {
  organizationId: string;
  documents?: DocumentItem[];
  auditAnalysis?: AuditAnalysisResult;
  isLoading: boolean;
  onUploadDocuments?: () => void;
  onClassifyDocument?: (documentId: string) => void;
  onRunAuditAnalysis?: () => void;
  className?: string;
}

export function AuditDashboard({
  documents = [],
  auditAnalysis,
  isLoading,
  onUploadDocuments,
  onClassifyDocument,
  onRunAuditAnalysis,
  className = "",
}: AuditDashboardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const getStatusColor = (status: DocumentItem["status"]) => {
    switch (status) {
      case "ANALYZED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "CLASSIFIED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "ERROR":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const handleRunAnalysis = () => {
    if (onRunAuditAnalysis) {
      setIsAnalyzing(true);
      try {
        onRunAuditAnalysis();
      } finally {
        // Reset analyzing state after a delay to show the processing state
        setTimeout(() => setIsAnalyzing(false), 1000);
      }
    }
  };

  const recentDocuments = documents
    .sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Audit Engine
            </CardTitle>
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-32" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Audit Analysis Summary */}
      {auditAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Latest Audit Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Risk Score
                </div>
                <div
                  className={`text-lg font-semibold ${getRiskScoreColor(auditAnalysis.riskScore)}`}
                >
                  {auditAnalysis.riskScore}%
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Documentation Rate
                </div>
                <div className="text-lg font-semibold">
                  {auditAnalysis.completeness.documentationRate}%
                </div>
              </div>
            </div>

            {auditAnalysis.anomalies.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Key Anomalies</div>
                <div className="space-y-2">
                  {auditAnalysis.anomalies.slice(0, 3).map((anomaly, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
                      <div>
                        <div className="font-medium">{anomaly.type}</div>
                        <div className="text-muted-foreground">
                          {anomaly.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {auditAnalysis.completeness.recommendations.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Recommendations</div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {auditAnalysis.completeness.recommendations
                    .slice(0, 2)
                    .map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Document Analysis
            </CardTitle>
            <div className="flex items-center gap-2">
              {onUploadDocuments && (
                <Button onClick={onUploadDocuments} size="sm" variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              )}
              {onRunAuditAnalysis && documents.length > 0 && (
                <Button
                  onClick={handleRunAnalysis}
                  size="sm"
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Run Analysis
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                No documents uploaded yet
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Upload financial documents to begin AI-powered audit analysis
              </p>
              {onUploadDocuments && (
                <Button onClick={onUploadDocuments} size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload First Document
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {recentDocuments.map(document => (
                <div
                  key={document.id}
                  className="group p-4 rounded-lg border transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-sm">{document.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {formatDistance(
                          new Date(document.uploadedAt),
                          new Date(),
                          { addSuffix: true }
                        )}
                      </p>
                    </div>
                    <Badge className={getStatusColor(document.status)}>
                      {document.status}
                    </Badge>
                  </div>

                  {document.classification && (
                    <div className="mb-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>Type:</span>
                        <span className="font-medium text-foreground">
                          {document.classification.classification}
                        </span>
                        <span className="text-xs">
                          (
                          {Math.round(document.classification.confidence * 100)}
                          % confidence)
                        </span>
                      </div>
                      {document.classification.extractedData && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {
                            Object.keys(document.classification.extractedData)
                              .length
                          }{" "}
                          fields extracted
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {document.classification?.linkedTransactions?.length ? (
                        <span>
                          {document.classification.linkedTransactions.length}{" "}
                          linked transactions
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onClassifyDocument && document.status === "PENDING" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => onClassifyDocument(document.id)}
                        >
                          Classify
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {documents.length > 5 && (
                <div className="pt-2 border-t">
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    View all {documents.length} documents
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
