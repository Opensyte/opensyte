"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { read, utils } from "xlsx";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  UploadCloud,
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Sparkles,
  ShieldCheck,
  ListChecks,
} from "lucide-react";
import {
  CRM_CONTACT_FIELDS,
  CRM_REQUIRED_CONTACT_FIELDS,
  DEDUPE_MODES,
  type CRMContactFieldKey,
  type DedupeModeValue,
  type ImportRowRecord,
  type ImportableValue,
  isCRMContactField,
} from "~/lib/imports/definitions";
import {
  generateContactSchemaSuggestions,
  type ColumnSuggestionMap,
} from "~/lib/imports/schema-detection";
import {
  applyTemplateEntriesToColumns,
  type TemplateColumnSignature,
  type TemplateMappingConfig,
} from "~/lib/imports/templates";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/react";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";

type WizardStep = "upload" | "mapping" | "validation" | "summary";

interface ParsedDataset {
  columns: string[];
  rows: ImportRowRecord[];
  rowCount: number;
  samples: Record<string, string[]>;
  file: File;
}

const MAX_ROWS_FOR_VALIDATION = 250;

const CRM_FIELD_LABEL_LOOKUP: Record<CRMContactFieldKey, string> =
  CRM_CONTACT_FIELDS.reduce(
    (accumulator, field) => {
      accumulator[field.key] = field.label;
      return accumulator;
    },
    {} as Record<CRMContactFieldKey, string>
  );

const REQUIRED_FIELD_SET = new Set<CRMContactFieldKey>(
  CRM_REQUIRED_CONTACT_FIELDS
);

type ConfidenceLevel = "high" | "medium" | "low";

type TemplateSummary = {
  id: string;
  name: string;
  usageCount: number;
  lastUsedAt: string | null;
  mapping: TemplateMappingConfig;
  columnSignature: TemplateColumnSignature;
  matchScore: number | null;
  coverage: number | null;
};

function normalizeImportCellValue(value: unknown): ImportableValue {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (value instanceof Date) {
    const iso = value.toISOString();
    return iso.length > 0 ? iso : null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return null;
}

function sanitizeColumnLabel(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toString() : "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return "";
}

function collectSamples(rows: ImportRowRecord[], column: string): string[] {
  const seen = new Set<string>();
  const samples: string[] = [];

  for (const row of rows) {
    const value = row[column];
    if (value === null || value === undefined) {
      continue;
    }

    let text: string | null = null;
    if (typeof value === "string") {
      text = value;
    } else if (typeof value === "number") {
      text = Number.isFinite(value) ? value.toString() : null;
    } else if (typeof value === "boolean") {
      text = value ? "true" : "false";
    }

    if (text === null || text.length === 0 || seen.has(text)) {
      continue;
    }

    seen.add(text);
    samples.push(text);

    if (samples.length >= 3) {
      break;
    }
  }

  return samples;
}

function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 80) {
    return "high";
  }

  if (confidence >= 50) {
    return "medium";
  }

  return "low";
}

async function parseCsvFile(
  file: File
): Promise<Pick<ParsedDataset, "columns" | "rows">> {
  const text = await file.text();
  return await new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: "greedy",
      delimiter: ",",
      complete: result => {
        if (result.errors.length > 0) {
          reject(new Error(result.errors[0]?.message ?? "Failed to parse CSV"));
          return;
        }

        const fields = result.meta.fields ?? [];
        const columns = fields
          .filter((field): field is string => typeof field === "string")
          .map(field => sanitizeColumnLabel(field))
          .filter(field => field.length > 0);

        const rows = result.data
          .map(record => {
            const row: ImportRowRecord = {};
            columns.forEach(column => {
              row[column] = normalizeImportCellValue(record[column]);
            });
            return row;
          })
          .filter(row => columns.some(column => row[column] !== null));

        resolve({ columns, rows });
      },
      error: (error: unknown) => {
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    });
  });
}

async function parseExcelFile(
  file: File
): Promise<Pick<ParsedDataset, "columns" | "rows">> {
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Unable to locate the first worksheet in the file");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    throw new Error("Unable to read worksheet data from the file");
  }
  const sheetRows = utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: null,
  });

  if (sheetRows.length === 0) {
    return { columns: [], rows: [] };
  }

  const [headerRowRaw, ...dataRows] = sheetRows;
  const headerRow = Array.isArray(headerRowRaw) ? headerRowRaw : [];

  const columns = headerRow
    .map(cell => sanitizeColumnLabel(cell))
    .filter(cell => cell.length > 0);

  const rows = dataRows
    .map(row => {
      const record: ImportRowRecord = {};
      columns.forEach((column, index) => {
        record[column] = normalizeImportCellValue(
          Array.isArray(row) ? row[index] : null
        );
      });
      return record;
    })
    .filter(row => columns.some(column => row[column] !== null));

  return { columns, rows };
}

async function parseFile(file: File): Promise<ParsedDataset> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  let parsed: Pick<ParsedDataset, "columns" | "rows">;

  if (extension === "xlsx" || extension === "xls") {
    parsed = await parseExcelFile(file);
  } else {
    parsed = await parseCsvFile(file);
  }

  const rowCount = parsed.rows.length;
  const limitedRows = parsed.rows.slice(0, MAX_ROWS_FOR_VALIDATION);

  const samples: Record<string, string[]> = {};
  parsed.columns.forEach(column => {
    samples[column] = collectSamples(limitedRows, column);
  });

  return {
    columns: parsed.columns,
    rows: limitedRows,
    samples,
    rowCount,
    file,
  };
}

function StepIndicator({ step }: { step: WizardStep }) {
  const steps: { id: WizardStep; label: string }[] = [
    { id: "upload", label: "Upload" },
    { id: "mapping", label: "Mapping" },
    { id: "validation", label: "Validation" },
    { id: "summary", label: "Summary" },
  ];

  const activeIndex = steps.findIndex(entry => entry.id === step);
  const progressPercentage =
    activeIndex <= 0
      ? 0
      : Math.min(100, Math.round((activeIndex / (steps.length - 1)) * 100));

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        {steps.map((item, index) => {
          const isActive = activeIndex === index;
          const isCompleted = index < activeIndex;

          return (
            <div key={item.id} className="flex flex-col items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : isCompleted
                      ? "border-emerald-500/60 bg-emerald-500 text-white shadow-sm"
                      : "border-border/70 bg-background text-muted-foreground"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="size-4" /> : index + 1}
              </div>
              <span
                className={isActive ? "text-[11px] font-semibold" : undefined}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary/60 transition-all"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const level = getConfidenceLevel(confidence);
  const label = `${Math.round(confidence)}% match`;

  if (level === "high") {
    return (
      <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">
        {label}
      </Badge>
    );
  }

  if (level === "medium") {
    return (
      <Badge className="border-amber-200 bg-amber-100 text-amber-700">
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground">
      {label}
    </Badge>
  );
}

export function CRMImportWizard() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.orgId as string;

  const [step, setStep] = useState<WizardStep>("upload");
  const [parsedDataset, setParsedDataset] = useState<ParsedDataset | null>(
    null
  );
  const [mapping, setMapping] = useState<
    Record<string, CRMContactFieldKey | "">
  >({});
  const [columnSuggestions, setColumnSuggestions] =
    useState<ColumnSuggestionMap>({});
  const [dedupeMode, setDedupeMode] = useState<DedupeModeValue>("SKIP");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(
    null
  );
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const createSession = api.crmImport.createUploadSession.useMutation();
  const detectSchema = api.crmImport.detectSchema.useMutation();
  const validatePreview = api.crmImport.validateManualPreview.useMutation();
  const commitImport = api.crmImport.commitImport.useMutation();
  const templateQuery = api.crmImport.listTemplates.useQuery(
    {
      organizationId,
      columns: parsedDataset?.columns ?? [],
    },
    {
      enabled: parsedDataset !== null,
      staleTime: 60_000,
    }
  );
  const saveTemplateMutation = api.crmImport.saveTemplate.useMutation();
  const markTemplateUsage = api.crmImport.markTemplateUsage.useMutation();
  const sessionSummary = api.crmImport.getSessionSummary.useQuery(
    sessionId && organizationId
      ? { sessionId, organizationId }
      : { sessionId: "", organizationId: "" },
    {
      enabled: false,
    }
  );
  const templates = useMemo<TemplateSummary[]>(
    () => templateQuery.data ?? [],
    [templateQuery.data]
  );
  const isTemplateLoading = templateQuery.isLoading;
  const templateLoadError = templateQuery.isError ? templateQuery.error : null;

  const recommendedTemplate = useMemo<TemplateSummary | null>(() => {
    if (templates.length === 0) {
      return null;
    }

    const ranked = [...templates].sort((a, b) => {
      const aScore = a.matchScore ?? 0;
      const bScore = b.matchScore ?? 0;
      return bScore - aScore;
    });

    return ranked[0] ?? null;
  }, [templates]);

  const otherTemplates = useMemo<TemplateSummary[]>(() => {
    if (!recommendedTemplate) {
      return templates;
    }

    return templates.filter(template => template.id !== recommendedTemplate.id);
  }, [templates, recommendedTemplate]);

  const [validationResult, setValidationResult] = useState<Awaited<
    ReturnType<typeof validatePreview.mutateAsync>
  > | null>(null);
  const [commitResult, setCommitResult] = useState<Awaited<
    ReturnType<typeof commitImport.mutateAsync>
  > | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const mappingValues = useMemo(() => Object.values(mapping), [mapping]);
  const mappedFieldCount = useMemo(
    () => mappingValues.filter(value => value !== "").length,
    [mappingValues]
  );
  const requiredMissingFields = useMemo(
    () =>
      CRM_REQUIRED_CONTACT_FIELDS.filter(
        field => !mappingValues.includes(field)
      ),
    [mappingValues]
  );
  const mappingCoverage = useMemo(() => {
    if (!parsedDataset || parsedDataset.columns.length === 0) {
      return 0;
    }
    return Math.round((mappedFieldCount / parsedDataset.columns.length) * 100);
  }, [parsedDataset, mappedFieldCount]);
  const showUploadOverlay =
    isParsing || createSession.isPending || detectSchema.isPending;
  const uploadOverlayMessage = useMemo(() => {
    if (isParsing) {
      return "Analyzing file";
    }
    if (detectSchema.isPending) {
      return "Detecting data schema";
    }
    if (createSession.isPending) {
      return "Preparing upload session";
    }
    return "Processing";
  }, [isParsing, detectSchema.isPending, createSession.isPending]);
  const showTemplateSkeleton = isTemplateLoading && templates.length === 0;

  const requiredFieldsSatisfied = useMemo(() => {
    const mappedValues = new Set(
      Object.values(mapping).filter(
        (value): value is CRMContactFieldKey => value !== ""
      )
    );

    return CRM_REQUIRED_CONTACT_FIELDS.every(field => mappedValues.has(field));
  }, [mapping]);
  const canSaveTemplate =
    parsedDataset !== null && sessionId !== null && requiredFieldsSatisfied;

  const uploadDisabled =
    createSession.isPending || detectSchema.isPending || isParsing;
  const canProceedToValidation =
    parsedDataset !== null &&
    sessionId !== null &&
    requiredFieldsSatisfied &&
    !validatePreview.isPending;
  const canCommit =
    validationResult?.summary.status === "READY_TO_IMPORT" &&
    !commitImport.isPending &&
    sessionId !== null;

  async function handleFileSelection(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const file = files.item(0);
    if (!file) {
      toast.error("No file was provided. Please try again.");
      return;
    }
    setIsParsing(true);
    setAppliedTemplateId(null);
    setTemplateName("");

    try {
      const dataset = await parseFile(file);

      if (dataset.columns.length === 0 || dataset.rows.length === 0) {
        toast.error("We could not find any data rows in this file.");
        setIsParsing(false);
        return;
      }

      const session = await createSession.mutateAsync({
        organizationId,
        entityType: "CONTACT",
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type ?? undefined,
        columns: dataset.columns,
        rowCount: dataset.rowCount,
      });

      let detectionSuggestions: ColumnSuggestionMap = {};
      let recommendedMapping: Record<string, CRMContactFieldKey | null> = {};

      try {
        const detection = await detectSchema.mutateAsync({
          sessionId: session.id,
          organizationId,
          columns: dataset.columns,
          sampleRows: dataset.rows,
        });

        detectionSuggestions = detection.columnSuggestions;
        recommendedMapping = detection.recommendedMapping;
      } catch (error) {
        const fallback = generateContactSchemaSuggestions({
          columns: dataset.columns,
          rows: dataset.rows,
        });

        detectionSuggestions = fallback.columnSuggestions;
        recommendedMapping = fallback.recommendedMapping;

        const message =
          error instanceof Error
            ? error.message
            : "Automatic detection failed. We generated suggestions locally.";
        toast.warning(message);
      }

      const initialMapping: Record<string, CRMContactFieldKey | ""> = {};
      dataset.columns.forEach(column => {
        const recommendedField = recommendedMapping[column] ?? null;
        initialMapping[column] = recommendedField ?? "";
      });

      setParsedDataset(dataset);
      setColumnSuggestions(detectionSuggestions);
      setMapping(initialMapping);
      setSessionId(session.id);
      setIsTemplateDialogOpen(false);
      setStep("mapping");
      toast.success("File uploaded. Configure your field mapping next.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to read the selected file.";
      toast.error(message);
    } finally {
      setIsParsing(false);
    }
  }

  function handleMappingChange(column: string, value: string) {
    const normalizedValue = value === "empty" ? "" : value;
    setMapping(current => ({
      ...current,
      [column]:
        normalizedValue === "" ? "" : (normalizedValue as CRMContactFieldKey),
    }));
  }

  function handleApplySuggestion(column: string, field: CRMContactFieldKey) {
    setMapping(current => ({
      ...current,
      [column]: field,
    }));
  }

  const handleApplyTemplate = useCallback(
    (template: TemplateSummary, options?: { quiet?: boolean }) => {
      if (!parsedDataset) {
        return;
      }

      const templateMapping = applyTemplateEntriesToColumns({
        entries: template.mapping.entries,
        columns: parsedDataset.columns,
      });

      setMapping(current => {
        const next = { ...current };
        parsedDataset.columns.forEach(column => {
          const targetField = templateMapping[column];
          if (targetField) {
            next[column] = targetField;
          }
        });
        return next;
      });

      setDedupeMode(template.mapping.dedupeMode);
      setAppliedTemplateId(template.id);

      if (sessionId) {
        markTemplateUsage.mutate({
          templateId: template.id,
          organizationId,
          sessionId,
        });
      }

      if (!options?.quiet) {
        toast.success(`Applied template "${template.name}".`);
      }
    },
    [parsedDataset, sessionId, markTemplateUsage, organizationId]
  );

  async function handleValidatePreview() {
    if (!parsedDataset || sessionId === null) {
      return;
    }

    try {
      const mappingPayload = parsedDataset.columns.map(column => {
        const rawValue = mapping[column];
        const targetField: CRMContactFieldKey | null =
          typeof rawValue === "string" && isCRMContactField(rawValue)
            ? rawValue
            : null;

        return {
          sourceColumn: column,
          targetField,
        };
      });

      const result = await validatePreview.mutateAsync({
        sessionId,
        organizationId,
        mapping: mappingPayload,
        rows: parsedDataset.rows,
        dedupeMode,
      });

      setValidationResult(result);
      setCommitResult(null);
      setStep("validation");
      toast.success(
        "Preview generated. Review validation results before importing."
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Validation failed. Please review your mapping.";
      toast.error(message);
    }
  }

  async function handleCommit() {
    if (sessionId === null) {
      return;
    }

    try {
      const result = await commitImport.mutateAsync({
        sessionId,
        organizationId,
      });

      setCommitResult(result);
      setStep("summary");
      toast.success("Import completed successfully.");
      await sessionSummary.refetch();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Import failed. Please try again.";
      toast.error(message);
    }
  }

  async function handleSaveTemplate() {
    if (!parsedDataset || sessionId === null) {
      return;
    }

    const trimmedName = templateName.trim();
    if (trimmedName.length < 2) {
      toast.error("Template name must be at least 2 characters.");
      return;
    }

    try {
      const mappingPayload = parsedDataset.columns.map(column => {
        const rawValue = mapping[column];
        const targetField =
          typeof rawValue === "string" && isCRMContactField(rawValue)
            ? rawValue
            : null;

        return {
          sourceColumn: column,
          targetField,
        };
      });

      const savedTemplate = await saveTemplateMutation.mutateAsync({
        sessionId,
        organizationId,
        name: trimmedName,
        mapping: mappingPayload,
        columns: parsedDataset.columns,
        dedupeMode,
      });

      toast.success(`Saved template "${savedTemplate.name}".`);
      setIsTemplateDialogOpen(false);
      setTemplateName("");
      setAppliedTemplateId(savedTemplate.id);
      await templateQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to save this template. Please try again.";
      toast.error(message);
    }
  }

  function resetWizard() {
    setParsedDataset(null);
    setMapping({});
    setDedupeMode("SKIP");
    setColumnSuggestions({});
    setSessionId(null);
    setValidationResult(null);
    setCommitResult(null);
    setStep("upload");
    setAppliedTemplateId(null);
    setTemplateName("");
    setIsTemplateDialogOpen(false);
  }

  useEffect(() => {
    if (
      step === "mapping" &&
      parsedDataset &&
      recommendedTemplate &&
      appliedTemplateId === null &&
      (recommendedTemplate.matchScore ?? 0) >= 80
    ) {
      handleApplyTemplate(recommendedTemplate, { quiet: true });
      toast.success(
        `Automatically applied template "${recommendedTemplate.name}" (${recommendedTemplate.matchScore ?? 0}% match).`
      );
    }
  }, [
    step,
    parsedDataset,
    recommendedTemplate,
    appliedTemplateId,
    handleApplyTemplate,
  ]);

  return (
    <ClientPermissionGuard
      requiredPermissions={[PERMISSIONS.CRM_WRITE]}
      fallback={
        <Alert>
          <AlertTitle>Permission required</AlertTitle>
          <AlertDescription>
            You need <span className="font-semibold">crm:write</span> access to
            import CRM data.
          </AlertDescription>
        </Alert>
      }
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-semibold">
              CRM Data Import
            </CardTitle>
            <CardDescription>
              Upload a CSV or Excel file, map your fields, and import contacts
              in bulk.
            </CardDescription>
          </div>
          <StepIndicator step={step} />
        </div>

        {step === "upload" && (
          <Card className="relative overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm">
            <div className="pointer-events-none absolute inset-0 opacity-60">
              <div className="absolute inset-y-0 left-1/2 w-[50%] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/20 via-transparent to-transparent blur-3xl" />
            </div>
            <CardHeader className="relative space-y-4 text-center">
              <CardTitle className="flex flex-col items-center gap-3 text-2xl font-semibold">
                <span className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
                  <Sparkles className="size-4" /> Intelligent Import Assistant
                </span>
                <UploadCloud className="size-10 text-primary" />
                Upload your CRM data file
              </CardTitle>
              <CardDescription className="mx-auto max-w-2xl text-sm text-muted-foreground">
                Upload clean CSV or Excel files up to 10&nbsp;MB (100k rows). We
                only validate the first {MAX_ROWS_FOR_VALIDATION} rows to keep
                things fast, but the full dataset is imported once everything
                looks good.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative flex flex-col gap-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card/70 p-4 text-left shadow-sm">
                  <Sparkles className="mb-2 size-5 text-primary" />
                  <p className="text-sm font-semibold text-foreground">
                    Smart suggestions
                  </p>
                  <p className="text-xs text-muted-foreground">
                    We auto-map columns for you and surface confidence scores
                    per field.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card/70 p-4 text-left shadow-sm">
                  <ShieldCheck className="mb-2 size-5 text-primary" />
                  <p className="text-sm font-semibold text-foreground">
                    Safe & secure
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Data stays in your tenant. Nothing is stored beyond this
                    import session.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card/70 p-4 text-left shadow-sm">
                  <ListChecks className="mb-2 size-5 text-primary" />
                  <p className="text-sm font-semibold text-foreground">
                    Built for teams
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Save mapping templates so everyone can reuse a proven
                    configuration.
                  </p>
                </div>
              </div>

              <div className="relative">
                <label className="group relative flex w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-primary/50 bg-background/80 p-10 text-center transition hover:border-primary hover:bg-primary/5 focus:outline-none">
                  <div className="flex flex-col items-center gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <UploadCloud className="size-5 text-primary" /> Drag &
                      drop or click to browse
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Supported formats: CSV, XLSX, XLS. UTF-8 recommended for
                      special characters.
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={event => handleFileSelection(event.target.files)}
                    disabled={uploadDisabled}
                  />
                  {showUploadOverlay && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/90 backdrop-blur-sm">
                      <Loader2 className="size-6 animate-spin text-primary" />
                      <div className="text-sm font-medium text-foreground">
                        {uploadOverlayMessage}...
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This usually takes just a few seconds.
                      </p>
                    </div>
                  )}
                </label>
              </div>

              <div className="rounded-xl border border-dashed border-muted/60 bg-background/70 p-5 text-sm text-muted-foreground">
                <p className="mb-3 text-sm font-semibold text-foreground">
                  File preparation tips
                </p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  <li className="flex items-start gap-2">
                    <ListChecks className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      Place column headers in the first row — we use them for
                      smart suggestions.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ListChecks className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      Keep one contact per row and remove blank rows or totals.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ListChecks className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      Ensure email addresses are valid if you plan to dedupe on
                      email.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ListChecks className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      Include consistent country / region values to improve
                      mapping accuracy.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={() => router.back()}
                  variant="ghost"
                  className="gap-2"
                >
                  <ArrowLeft className="size-4" />
                  Back to CRM overview
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "mapping" && parsedDataset && (
          <Card className="max-h-[90vh] overflow-y-auto border border-primary/10 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="size-5" />
                Map your columns to CRM fields
              </CardTitle>
              <CardDescription>
                File:{" "}
                <span className="font-medium">{parsedDataset.file.name}</span> ·{" "}
                {formatFileSize(parsedDataset.file.size)} ·{" "}
                {parsedDataset.rowCount} rows detected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Mapping coverage
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-primary">
                    {mappingCoverage}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {mappedFieldCount} of {parsedDataset.columns.length} columns
                    mapped
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Required fields
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {CRM_REQUIRED_CONTACT_FIELDS.length -
                      requiredMissingFields.length}{" "}
                    / {CRM_REQUIRED_CONTACT_FIELDS.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {requiredMissingFields.length === 0
                      ? "All required fields mapped"
                      : `${requiredMissingFields.length} required fields still unmapped`}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Dedupe strategy
                  </p>
                  <p className="mt-2 text-lg font-semibold capitalize text-foreground">
                    {dedupeMode.toLowerCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Configure how we treat matches in your existing CRM data.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Template match
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {recommendedTemplate?.matchScore
                      ? `${recommendedTemplate.matchScore}% best match`
                      : "No templates yet"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {templates.length === 0
                      ? "Save this configuration to accelerate future imports."
                      : "Apply a saved template to jump-start mapping."}
                  </p>
                </div>
              </div>

              <Alert>
                <AlertTitle>Required fields</AlertTitle>
                <AlertDescription>
                  Map{" "}
                  <span className="font-semibold">
                    {CRM_REQUIRED_CONTACT_FIELDS.join(", ")}
                  </span>{" "}
                  before continuing. Only the first {MAX_ROWS_FOR_VALIDATION}{" "}
                  rows are validated to keep things fast.
                </AlertDescription>
              </Alert>
              {requiredMissingFields.length > 0 && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                  <p className="font-semibold">Missing required fields</p>
                  <p className="mt-1 text-xs text-destructive/80">
                    Map the following fields to continue:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {requiredMissingFields.map(field => (
                      <Badge
                        key={field}
                        variant="destructive"
                        className="capitalize"
                      >
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Saved templates</span>
                    <p className="text-xs text-muted-foreground">
                      {isTemplateLoading
                        ? "Loading templates..."
                        : templates.length > 0
                          ? "Apply a saved mapping or save the current configuration for later."
                          : "Save this mapping configuration to reuse it in future imports."}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => setIsTemplateDialogOpen(true)}
                    disabled={
                      !canSaveTemplate || saveTemplateMutation.isPending
                    }
                  >
                    {saveTemplateMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Saving template
                      </span>
                    ) : (
                      "Save as template"
                    )}
                  </Button>
                </div>
                {templateLoadError && (
                  <p className="text-xs text-destructive">
                    {templateLoadError.message ??
                      "We couldn't load your templates right now."}
                  </p>
                )}
                {showTemplateSkeleton && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-20 animate-pulse rounded-lg border border-muted/40 bg-muted/40"
                      />
                    ))}
                  </div>
                )}
                {!isTemplateLoading &&
                  templates.length === 0 &&
                  !templateLoadError && (
                    <p className="text-xs text-muted-foreground">
                      No templates yet. Configure your mapping and save it for
                      the next import.
                    </p>
                  )}
                {templates.length > 0 && (
                  <div className="space-y-3">
                    {recommendedTemplate && (
                      <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">
                                {recommendedTemplate.name}
                              </span>
                              {recommendedTemplate.matchScore !== null && (
                                <Badge className="bg-primary text-primary-foreground">
                                  {recommendedTemplate.matchScore}% match
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {recommendedTemplate.mapping.entries.length}{" "}
                              mapped fields · {recommendedTemplate.usageCount}{" "}
                              uses
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() =>
                              handleApplyTemplate(recommendedTemplate)
                            }
                            disabled={
                              appliedTemplateId === recommendedTemplate.id
                            }
                          >
                            {appliedTemplateId === recommendedTemplate.id
                              ? "Template applied"
                              : "Apply template"}
                          </Button>
                        </div>
                      </div>
                    )}
                    {otherTemplates.length > 0 && (
                      <div className="space-y-3">
                        {otherTemplates.map(template => (
                          <div
                            key={template.id}
                            className="rounded-md border border-border p-3"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {template.name}
                                  </span>
                                  {template.matchScore !== null && (
                                    <Badge variant="outline">
                                      {template.matchScore}% match
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {template.mapping.entries.length} mapped
                                  fields · {template.usageCount} uses
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => handleApplyTemplate(template)}
                                disabled={appliedTemplateId === template.id}
                              >
                                {appliedTemplateId === template.id
                                  ? "Template applied"
                                  : "Apply"}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-muted/70 bg-background/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <span className="text-sm font-semibold text-foreground">
                    Deduplication strategy
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Decide how we should handle contacts that already exist in
                    your CRM.
                  </p>
                </div>
                <Select
                  value={dedupeMode}
                  onValueChange={value =>
                    setDedupeMode(value as DedupeModeValue)
                  }
                >
                  <SelectTrigger className="w-full sm:w-60">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEDUPE_MODES.map(mode => (
                      <SelectItem key={mode} value={mode}>
                        {mode === "SKIP" && "Skip existing contacts"}
                        {mode === "UPDATE" && "Update existing contacts"}
                        {mode === "CREATE" && "Create new records"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-muted/70 bg-background/80 shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source column</TableHead>
                      <TableHead>Suggested match</TableHead>
                      <TableHead>Sample data</TableHead>
                      <TableHead>CRM field</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedDataset.columns.map(column => {
                      const samples = parsedDataset.samples[column] ?? [];
                      const mappedField = mapping[column] ?? "";
                      const mappedFieldKey =
                        mappedField === "" ? null : mappedField;
                      const requiredMappedField =
                        mappedFieldKey !== null &&
                        REQUIRED_FIELD_SET.has(mappedFieldKey);
                      const suggestionsForColumn =
                        columnSuggestions[column] ?? [];
                      const bestSuggestion = suggestionsForColumn[0];
                      const suggestionLabel = bestSuggestion
                        ? CRM_FIELD_LABEL_LOOKUP[bestSuggestion.field]
                        : undefined;
                      const suggestionApplied =
                        bestSuggestion !== undefined &&
                        mappedFieldKey === bestSuggestion.field;

                      return (
                        <TableRow key={column}>
                          <TableCell className="font-medium">
                            {column}
                          </TableCell>
                          <TableCell>
                            {bestSuggestion ? (
                              <div className="space-y-3 rounded-lg border border-border bg-muted/60 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center rounded-full bg-background px-3 py-1 text-xs font-medium capitalize text-foreground">
                                      {suggestionLabel ?? bestSuggestion.field}
                                    </span>
                                    <ConfidenceBadge
                                      confidence={bestSuggestion.confidence}
                                    />
                                  </div>
                                  {suggestionApplied && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      Applied
                                    </Badge>
                                  )}
                                </div>
                                {bestSuggestion.reasons.length > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    {bestSuggestion.reasons[0]}
                                  </p>
                                )}
                                <div className="flex">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="w-full justify-center"
                                    onClick={() =>
                                      handleApplySuggestion(
                                        column,
                                        bestSuggestion.field
                                      )
                                    }
                                    disabled={suggestionApplied}
                                  >
                                    {suggestionApplied
                                      ? "Suggestion applied"
                                      : "Use suggestion"}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                No suggestion yet
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {samples.length === 0 && (
                                <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                                  No sample data
                                </span>
                              )}
                              {samples.map(sample => (
                                <span
                                  key={sample}
                                  className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs capitalize text-foreground"
                                >
                                  {sample}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={mappedField}
                              onValueChange={value =>
                                handleMappingChange(column, value)
                              }
                            >
                              <SelectTrigger
                                className={
                                  requiredMappedField
                                    ? "border-primary"
                                    : undefined
                                }
                              >
                                <SelectValue placeholder="Do not import" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="empty">
                                  Do not import
                                </SelectItem>
                                {CRM_CONTACT_FIELDS.map(field => (
                                  <SelectItem key={field.key} value={field.key}>
                                    {field.label}
                                    {field.required && (
                                      <span className="text-xs text-muted-foreground">
                                        {" "}
                                        (required)
                                      </span>
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:gap-0">
                <Button
                  variant="ghost"
                  onClick={() => setStep("upload")}
                  className="w-full sm:w-auto"
                >
                  <ArrowLeft className="size-4" />
                  Back to upload
                </Button>
                <Button
                  onClick={handleValidatePreview}
                  disabled={!canProceedToValidation}
                  className="w-full sm:w-auto"
                >
                  {validatePreview.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Generating preview...
                    </span>
                  ) : (
                    "Validate & preview"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "validation" && validationResult && (
          <Card className="max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Validation results</CardTitle>
              <CardDescription>
                Review rows with errors or warnings before committing the
                import. Only rows shown here were validated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-primary/20 bg-primary/5">
                <AlertTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="size-4 text-primary" />
                  Summary snapshot
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">
                  We validated {validationResult.summary.totalRows} rows.
                  Resolve any errors below and re-run the preview if needed.
                </AlertDescription>
              </Alert>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-muted/40">
                  <CardHeader className="space-y-1 py-4">
                    <CardTitle className="text-sm font-medium">
                      Total rows
                    </CardTitle>
                    <span className="text-2xl font-semibold">
                      {validationResult.summary.totalRows}
                    </span>
                  </CardHeader>
                </Card>
                <Card className="bg-muted/40">
                  <CardHeader className="space-y-1 py-4">
                    <CardTitle className="text-sm font-medium">
                      Valid rows
                    </CardTitle>
                    <span className="text-2xl font-semibold text-emerald-600">
                      {validationResult.summary.validRows}
                    </span>
                  </CardHeader>
                </Card>
                <Card className="bg-muted/40">
                  <CardHeader className="space-y-1 py-4">
                    <CardTitle className="text-sm font-medium">
                      Rows with errors
                    </CardTitle>
                    <span className="text-2xl font-semibold text-destructive">
                      {validationResult.summary.failedRows}
                    </span>
                  </CardHeader>
                </Card>
                <Card className="bg-muted/40">
                  <CardHeader className="space-y-1 py-4">
                    <CardTitle className="text-sm font-medium">
                      Skipped (dedupe)
                    </CardTitle>
                    <span className="text-2xl font-semibold text-orange-500">
                      {validationResult.summary.skippedRows}
                    </span>
                  </CardHeader>
                </Card>
              </div>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Issues</TableHead>
                      <TableHead>Mapped data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationResult.previewRows.map(row => (
                      <TableRow key={row.rowNumber}>
                        <TableCell className="font-medium">
                          {row.rowNumber}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.status === "VALIDATED"
                                ? "default"
                                : row.status === "FAILED"
                                  ? "destructive"
                                  : row.status === "SKIPPED"
                                    ? "secondary"
                                    : "outline"
                            }
                            className="capitalize"
                          >
                            {row.status.toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {row.issues.length === 0 && (
                              <span className="text-sm text-muted-foreground">
                                No issues detected
                              </span>
                            )}
                            {row.issues.map(issue => (
                              <Alert
                                key={`${row.rowNumber}-${issue.message}`}
                                variant={
                                  issue.severity === "ERROR"
                                    ? "destructive"
                                    : "default"
                                }
                              >
                                <AlertTitle className="text-xs font-semibold uppercase">
                                  {issue.severity.toLowerCase()}
                                </AlertTitle>
                                <AlertDescription className="space-y-1 text-xs">
                                  <p>{issue.message}</p>
                                  {issue.field && (
                                    <p className="text-muted-foreground">
                                      Field: {issue.field}
                                    </p>
                                  )}
                                  {issue.hint && (
                                    <p className="text-muted-foreground">
                                      Hint: {issue.hint}
                                    </p>
                                  )}
                                </AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(row.mappedData).map(
                              ([key, value]) => (
                                <Badge
                                  key={key}
                                  variant="secondary"
                                  className="capitalize"
                                >
                                  <span className="font-medium">{key}:</span>{" "}
                                  {value ?? ""}
                                </Badge>
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:gap-0">
                <Button
                  variant="ghost"
                  onClick={() => setStep("mapping")}
                  className="w-full sm:w-auto"
                >
                  <ArrowLeft className="size-4" />
                  Adjust mapping
                </Button>
                <Button
                  onClick={handleCommit}
                  disabled={!canCommit}
                  className="w-full sm:w-auto"
                >
                  {commitImport.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Importing...
                    </span>
                  ) : (
                    "Commit import"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "summary" && commitResult && (
          <Card className="max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Import summary</CardTitle>
              <CardDescription>
                {commitResult.results.total} rows processed. Download error
                reports from the validation step if you need to retry.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-emerald-200/60 bg-emerald-50/60">
                <AlertTitle className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="size-4" /> Import completed
                  successfully
                </AlertTitle>
                <AlertDescription className="text-xs text-emerald-700/80">
                  Your contacts are now available in the CRM. You can review the
                  imported records or start a new import.
                </AlertDescription>
              </Alert>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-muted/40">
                  <CardHeader className="space-y-1 py-4">
                    <CardTitle className="text-sm font-medium">
                      Imported
                    </CardTitle>
                    <span className="text-2xl font-semibold text-emerald-600">
                      {commitResult.results.imported}
                    </span>
                  </CardHeader>
                </Card>
                <Card className="bg-muted/40">
                  <CardHeader className="space-y-1 py-4">
                    <CardTitle className="text-sm font-medium">
                      Failed
                    </CardTitle>
                    <span className="text-2xl font-semibold text-destructive">
                      {commitResult.results.failed}
                    </span>
                  </CardHeader>
                </Card>
                <Card className="bg-muted/40">
                  <CardHeader className="space-y-1 py-4">
                    <CardTitle className="text-sm font-medium">
                      Skipped
                    </CardTitle>
                    <span className="text-2xl font-semibold text-orange-500">
                      {commitResult.results.skipped}
                    </span>
                  </CardHeader>
                </Card>
                <Card className="bg-muted/40">
                  <CardHeader className="space-y-1 py-4">
                    <CardTitle className="text-sm font-medium">
                      Status
                    </CardTitle>
                    <Badge className="w-fit capitalize">
                      {commitResult.status.toLowerCase()}
                    </Badge>
                  </CardHeader>
                </Card>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:gap-0">
                <Button onClick={resetWizard} className="w-full sm:w-auto">
                  Start new import
                </Button>
                <Button
                  asChild
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  <Link href={`/${organizationId}/crm/contacts`}>
                    View imported contacts
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save mapping as template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Give this mapping a descriptive name so you can reuse it for the
              next import.
            </p>
            <Input
              value={templateName}
              onChange={event => setTemplateName(event.target.value)}
              placeholder="e.g. HubSpot contact export"
              autoFocus
            />
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => setIsTemplateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={handleSaveTemplate}
              disabled={!canSaveTemplate || saveTemplateMutation.isPending}
            >
              {saveTemplateMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientPermissionGuard>
  );
}
