import { generateObject } from "ai";
import { z } from "zod";
import { getAIModel, isAIEnabled } from "./config";

// Types for audit services
interface TransactionData {
  id: string;
  type: string;
  amount: number;
  date: string;
  description?: string;
  vendor?: string;
}

interface DocumentData {
  id: string;
  fileName: string;
  type: string;
  classification?: string;
}

// Document Classification Schema
const documentClassificationSchema = z.object({
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

type DocumentClassificationResult = z.infer<
  typeof documentClassificationSchema
>;

// Document Classification Service
export async function classifyDocument(
  fileContent: string,
  fileName: string,
  fileType: string
): Promise<DocumentClassificationResult> {
  if (!isAIEnabled()) {
    throw new Error("AI features are not enabled");
  }

  try {
    const result = await generateObject({
      model: getAIModel(),
      temperature: 0.1,
      schema: documentClassificationSchema,
      prompt: `
        Analyze this financial document and classify it:
        
        File Name: ${fileName}
        File Type: ${fileType}
        Content: ${fileContent.substring(0, 2000)}
        
        Tasks:
        1. Classify the document type
        2. Extract key financial data if present
        3. Provide confidence score (0-1) for classification
        4. Suggest any transaction IDs this might relate to
        
        Be precise and conservative with confidence scores.
      `,
    });

    return result.object;
  } catch (error) {
    console.error("Document classification failed:", error);
    return {
      classification: "UNKNOWN",
      confidence: 0,
      extractedData: undefined,
      linkedTransactions: [],
    };
  }
}

// Audit Analysis Schema
const auditAnalysisSchema = z.object({
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

type AuditAnalysisResult = z.infer<typeof auditAnalysisSchema>;

// Audit Analysis Service
export async function generateAuditAnalysis(
  transactions: TransactionData[],
  documents: DocumentData[],
  timeRange: { start: Date; end: Date }
): Promise<AuditAnalysisResult> {
  if (!isAIEnabled()) {
    throw new Error("AI features are not enabled");
  }

  try {
    const result = await generateObject({
      model: getAIModel(),
      temperature: 0.2,
      schema: auditAnalysisSchema,
      prompt: `
        Perform an audit analysis on this financial data:
        
        Time Range: ${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}
        Total Transactions: ${transactions.length}
        Total Documents: ${documents.length}
        
        Transaction Summary:
        ${transactions
          .slice(0, 10)
          .map(t => `- ${t.type}: $${t.amount} on ${t.date}`)
          .join("\n")}
        ${transactions.length > 10 ? `... and ${transactions.length - 10} more` : ""}
        
        Document Summary:
        ${documents
          .slice(0, 5)
          .map(d => `- ${d.type}: ${d.fileName}`)
          .join("\n")}
        ${documents.length > 5 ? `... and ${documents.length - 5} more` : ""}
        
        Analyze for:
        1. Risk assessment (0-100 score)
        2. Anomaly detection
        3. Documentation completeness
        4. Audit readiness
        
        Provide actionable recommendations for audit preparation.
      `,
    });

    return result.object;
  } catch (error) {
    console.error("Audit analysis failed:", error);
    throw new Error("Failed to generate audit analysis");
  }
}

// Anomaly Detection Schema
const anomalySchema = z.object({
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

type AnomalyDetectionResult = z.infer<typeof anomalySchema>;

// Anomaly Detection Service
export async function detectAnomalies(
  data: Record<string, unknown>[],
  context: string
): Promise<AnomalyDetectionResult> {
  if (!isAIEnabled()) {
    return {
      anomalies: [],
      riskLevel: "LOW",
      summary: "AI features are disabled",
    };
  }

  try {
    const result = await generateObject({
      model: getAIModel(),
      temperature: 0.1,
      schema: anomalySchema,
      prompt: `
        Analyze this ${context} data for anomalies:
        
        ${JSON.stringify(data.slice(0, 20), null, 2)}
        ${data.length > 20 ? `\n... and ${data.length - 20} more items` : ""}
        
        Look for:
        - Unusual patterns in amounts or timing
        - Duplicate entries
        - Suspicious vendor relationships
        - Irregular approval workflows
        - Missing required fields
        - Outlier transactions
        
        Provide structured anomaly detection results.
      `,
    });

    return result.object;
  } catch (error) {
    console.error("Anomaly detection failed:", error);
    return {
      anomalies: [],
      riskLevel: "LOW",
      summary: "Anomaly detection failed",
    };
  }
}
