import {
  CRM_CONTACT_FIELDS,
  CRM_SUPPORTED_CONTACT_TYPES,
  CRM_SUPPORTED_LEAD_SOURCES,
  CRM_SUPPORTED_LEAD_STATUS,
  EMAIL_REGEX,
  type CRMContactFieldKey,
  type ImportRowRecord,
} from "~/lib/imports/definitions";

export type FieldSuggestion = {
  field: CRMContactFieldKey;
  confidence: number;
  reasons: string[];
};

export type ColumnSuggestionMap = Record<string, FieldSuggestion[]>;

const UPPERCASE_STATUS_VALUES = new Set(
  CRM_SUPPORTED_LEAD_STATUS.map(status => status.toUpperCase())
);

const UPPERCASE_TYPE_VALUES = new Set(
  CRM_SUPPORTED_CONTACT_TYPES.map(type => type.toUpperCase())
);

const UPPERCASE_SOURCE_VALUES = new Set(
  CRM_SUPPORTED_LEAD_SOURCES.map(source => source.toUpperCase())
);

function clampConfidence(value: number): number {
  if (value < 0) {
    return 0;
  }

  if (value > 100) {
    return 100;
  }

  return value;
}

export function normalizeColumnHeader(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeSample(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toString() : null;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return null;
}

function collectSamples(
  rows: ImportRowRecord[],
  column: string,
  maxSamples: number
): string[] {
  const seen = new Set<string>();
  const samples: string[] = [];

  for (const row of rows) {
    const rawValue = row[column];
    const normalized = normalizeSample(rawValue);

    if (!normalized) {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    samples.push(normalized);

    if (samples.length >= maxSamples) {
      break;
    }
  }

  return samples;
}

function levenshteinDistance(a: string, b: string): number {
  const aLength = a.length;
  const bLength = b.length;

  if (aLength === 0) {
    return bLength;
  }

  if (bLength === 0) {
    return aLength;
  }

  let previousRow = new Array<number>(bLength + 1).fill(0);
  let currentRow = new Array<number>(bLength + 1).fill(0);

  for (let j = 0; j <= bLength; j += 1) {
    previousRow[j] = j;
  }

  for (let i = 1; i <= aLength; i += 1) {
    currentRow[0] = i;

    for (let j = 1; j <= bLength; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const deletion = (previousRow[j] ?? Number.POSITIVE_INFINITY) + 1;
      const insertion = (currentRow[j - 1] ?? Number.POSITIVE_INFINITY) + 1;
      const substitution =
        (previousRow[j - 1] ?? Number.POSITIVE_INFINITY) + cost;

      currentRow[j] = Math.min(deletion, insertion, substitution);
    }

    [previousRow, currentRow] = [currentRow, previousRow];
  }

  const result = previousRow[bLength];
  return result ?? Math.max(aLength, bLength);
}

function calculateHeaderSimilarity(source: string, target: string): number {
  if (source.length === 0 || target.length === 0) {
    return 0;
  }

  const distance = levenshteinDistance(source, target);
  const maxLength = Math.max(source.length, target.length);

  if (maxLength === 0) {
    return 0;
  }

  return 1 - distance / maxLength;
}

function calculateRatio(matches: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return matches / total;
}

function generateColumnSuggestion(
  column: string,
  samples: string[]
): FieldSuggestion[] {
  const normalizedColumn = normalizeColumnHeader(column);
  const upperSamples = samples.map(sample => sample.toUpperCase());

  const suggestions: FieldSuggestion[] = [];

  for (const field of CRM_CONTACT_FIELDS) {
    let confidence = 0;
    const reasons: string[] = [];

    const normalizedLabel = normalizeColumnHeader(field.label);
    const normalizedKey = normalizeColumnHeader(field.key);

    const similarityToLabel = calculateHeaderSimilarity(
      normalizedColumn,
      normalizedLabel
    );
    const similarityToKey = calculateHeaderSimilarity(
      normalizedColumn,
      normalizedKey
    );
    const bestHeaderSimilarity = Math.max(similarityToLabel, similarityToKey);

    if (bestHeaderSimilarity > 0) {
      const headerScore = Math.round(bestHeaderSimilarity * 60);
      confidence += headerScore;
      reasons.push(
        `Header similarity ${(bestHeaderSimilarity * 100).toFixed(0)}%`
      );
    }

    if (
      normalizedColumn.length > 0 &&
      (normalizedColumn === normalizedLabel ||
        normalizedColumn === normalizedKey)
    ) {
      confidence += 20;
      reasons.push("Column header matches CRM field");
    }

    if (samples.length > 0) {
      switch (field.key) {
        case "email": {
          const matchCount = samples.filter(sample =>
            EMAIL_REGEX.test(sample)
          ).length;
          const ratio = calculateRatio(matchCount, samples.length);
          if (ratio >= 0.6) {
            confidence += 30;
            reasons.push("Sample values look like valid email addresses");
          }
          break;
        }
        case "status": {
          const validCount = upperSamples.filter(sample =>
            UPPERCASE_STATUS_VALUES.has(sample)
          ).length;
          const ratio = calculateRatio(validCount, upperSamples.length);
          if (ratio >= 0.6 && upperSamples.length > 0) {
            confidence += 30;
            reasons.push("Sample values match known CRM statuses");
          }
          break;
        }
        case "type": {
          const validCount = upperSamples.filter(sample =>
            UPPERCASE_TYPE_VALUES.has(sample)
          ).length;
          const ratio = calculateRatio(validCount, upperSamples.length);
          if (ratio >= 0.6 && upperSamples.length > 0) {
            confidence += 30;
            reasons.push("Sample values match supported contact types");
          }
          break;
        }
        case "source": {
          const validCount = upperSamples.filter(sample =>
            UPPERCASE_SOURCE_VALUES.has(sample)
          ).length;
          const ratio = calculateRatio(validCount, upperSamples.length);
          if (ratio >= 0.6 && upperSamples.length > 0) {
            confidence += 25;
            reasons.push("Sample values align with known lead sources");
          }
          break;
        }
        case "phone": {
          const numericCount = samples.filter(sample => {
            const digits = sample.replace(/\D/g, "");
            return digits.length >= 7;
          }).length;
          const ratio = calculateRatio(numericCount, samples.length);
          if (ratio >= 0.6) {
            confidence += 20;
            reasons.push("Sample values resemble phone numbers");
          }
          break;
        }
        case "postalCode": {
          const postalMatches = samples.filter(sample =>
            /[A-Za-z0-9]{4,}/.test(sample)
          ).length;
          const ratio = calculateRatio(postalMatches, samples.length);
          if (ratio >= 0.6) {
            confidence += 10;
            reasons.push("Sample values look like postal codes");
          }
          break;
        }
        default:
          break;
      }
    }

    const clampedConfidence = clampConfidence(confidence);
    if (clampedConfidence > 0) {
      suggestions.push({
        field: field.key,
        confidence: clampedConfidence,
        reasons,
      });
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

function buildInitialMapping(
  columns: string[],
  columnSuggestions: ColumnSuggestionMap,
  autoMapThreshold: number
): Record<string, CRMContactFieldKey | null> {
  const mapping: Record<string, CRMContactFieldKey | null> = {};

  const candidateMap = new Map<string, CRMContactFieldKey>(
    CRM_CONTACT_FIELDS.map(field => [
      normalizeColumnHeader(field.label),
      field.key,
    ])
  );

  columns.forEach(column => {
    const normalized = normalizeColumnHeader(column);
    const directMatch = candidateMap.get(normalized);

    if (directMatch) {
      mapping[column] = directMatch;
      return;
    }

    const suggestion = columnSuggestions[column]?.[0];
    if (suggestion && suggestion.confidence >= autoMapThreshold) {
      mapping[column] = suggestion.field;
      return;
    }

    mapping[column] = null;
  });

  return mapping;
}

export function generateContactSchemaSuggestions(args: {
  columns: string[];
  rows: ImportRowRecord[];
  sampleSize?: number;
  autoMapThreshold?: number;
}): {
  columnSuggestions: ColumnSuggestionMap;
  recommendedMapping: Record<string, CRMContactFieldKey | null>;
} {
  const { columns, rows, sampleSize = 5, autoMapThreshold = 80 } = args;

  const columnSuggestions: ColumnSuggestionMap = {};

  columns.forEach(column => {
    const samples = collectSamples(rows, column, sampleSize);
    columnSuggestions[column] = generateColumnSuggestion(column, samples);
  });

  const recommendedMapping = buildInitialMapping(
    columns,
    columnSuggestions,
    autoMapThreshold
  );

  return {
    columnSuggestions,
    recommendedMapping,
  };
}
