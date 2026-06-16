// Locale-aware formatting via the native Intl APIs.
// The invoice's *currency* (ISO 4217) is always respected so every country
// formats with the correct symbol/decimals/separators. The display locale is
// English for now (i18n not yet integrated) but kept as a parameter so more
// languages can be added later without touching call sites.

const DEFAULT_LOCALE = "en";

function toNumber(value: number | string): number {
  if (typeof value === "number") return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Format a money amount in the given ISO 4217 currency. */
export function formatCurrency(
  amount: number | string,
  currency: string,
  locale: string = DEFAULT_LOCALE
): string {
  const value = toNumber(amount);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
    }).format(value);
  } catch {
    // Fallback for an unknown/invalid currency code.
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** Format a date (medium style: e.g. "Jun 15, 2026"). */
export function formatDate(
  date: Date | string,
  locale: string = DEFAULT_LOCALE
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

/** Format a plain number (e.g. quantities) for the locale. */
export function formatNumber(
  value: number | string,
  locale: string = DEFAULT_LOCALE
): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}
