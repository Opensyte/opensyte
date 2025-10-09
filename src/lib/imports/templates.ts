import type {
  CRMContactFieldKey,
  DedupeModeValue,
} from "~/lib/imports/definitions";
import { isCRMContactField } from "~/lib/imports/definitions";
import { normalizeColumnHeader } from "~/lib/imports/schema-detection";

export type TemplateMappingEntry = {
  sourceColumn: string;
  normalizedSourceColumn: string;
  targetField: CRMContactFieldKey;
};

export type TemplateMappingConfig = {
  entries: TemplateMappingEntry[];
  dedupeMode: DedupeModeValue;
  updatedAt: string;
};

export type TemplateColumnSignature = {
  columns: string[];
  normalizedColumns: string[];
  generatedAt: string;
};

export function buildTemplateColumnSignature(
  columns: string[]
): TemplateColumnSignature {
  const normalizedColumns = columns.map(column =>
    normalizeColumnHeader(column)
  );
  return {
    columns,
    normalizedColumns,
    generatedAt: new Date().toISOString(),
  } satisfies TemplateColumnSignature;
}

export function buildTemplateMappingEntries(args: {
  columns: string[];
  mapping: Record<string, CRMContactFieldKey | "">;
}): TemplateMappingEntry[] {
  const { columns, mapping } = args;

  return columns
    .map(column => {
      const targetField = mapping[column];
      if (!targetField) {
        return null;
      }

      if (!isCRMContactField(targetField)) {
        return null;
      }

      return {
        sourceColumn: column,
        normalizedSourceColumn: normalizeColumnHeader(column),
        targetField,
      } satisfies TemplateMappingEntry;
    })
    .filter((entry): entry is TemplateMappingEntry => entry !== null);
}

export function applyTemplateEntriesToColumns(args: {
  entries: TemplateMappingEntry[];
  columns: string[];
}): Record<string, CRMContactFieldKey> {
  const { entries, columns } = args;
  const normalizedColumnMap = new Map<string, string>();
  columns.forEach(column => {
    normalizedColumnMap.set(normalizeColumnHeader(column), column);
  });

  const mapping: Record<string, CRMContactFieldKey> = {};
  entries.forEach(entry => {
    const column = normalizedColumnMap.get(entry.normalizedSourceColumn);
    if (column) {
      mapping[column] = entry.targetField;
    }
  });

  return mapping;
}

export function calculateTemplateMatch(args: {
  signature: TemplateColumnSignature;
  columns: string[];
}): {
  score: number;
  coverage: number;
  matchedNormalizedColumns: string[];
} {
  const { signature, columns } = args;
  const normalizedTargetColumns = columns.map(column =>
    normalizeColumnHeader(column)
  );
  const templateNormalized = new Set(signature.normalizedColumns);
  const matchedNormalizedColumns: string[] = [];

  let matchedCount = 0;
  normalizedTargetColumns.forEach(normalized => {
    if (!normalized) {
      return;
    }

    if (templateNormalized.has(normalized)) {
      matchedCount += 1;
      matchedNormalizedColumns.push(normalized);
    }
  });

  const targetCount = normalizedTargetColumns.length;
  const templateCount = signature.normalizedColumns.length;
  const coverage = templateCount === 0 ? 0 : matchedCount / templateCount;
  const accuracy = targetCount === 0 ? 0 : matchedCount / targetCount;
  const score = Math.round(((coverage + accuracy) / 2) * 100);

  return {
    score,
    coverage,
    matchedNormalizedColumns,
  };
}
