/**
 * Shared currency formatting utilities for both client and server
 */

/**
 * Format currency values based on currency type
 */
export function formatCurrency(
  value: number | string | { toString(): string },
  currency = "USD"
): string {
  let numericValue: number;

  if (typeof value === "number") {
    numericValue = value;
  } else if (typeof value === "string") {
    numericValue = parseFloat(value);
    if (isNaN(numericValue)) return "0";
  } else if (value && typeof value === "object" && "toString" in value) {
    try {
      numericValue = parseFloat(value.toString());
      if (isNaN(numericValue)) return "0";
    } catch {
      return "0";
    }
  } else {
    return "0";
  }

  // IDR doesn't use decimal places and uses thousands separators
  if (currency === "IDR") {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(numericValue));
  }

  // For other currencies, use 2 decimal places with appropriate locale
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

/**
 * Get currency symbol for display
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    IDR: "Rp",
    JPY: "¥",
    CNY: "¥",
    AUD: "A$",
    CAD: "C$",
  };

  return symbols[currency] ?? currency;
}

/**
 * Format currency with symbol
 */
export function formatCurrencyWithSymbol(
  value: number | string | { toString(): string },
  currency = "USD"
): string {
  const formattedAmount = formatCurrency(value, currency);
  const symbol = getCurrencySymbol(currency);

  // For IDR, put symbol before the amount
  if (currency === "IDR") {
    return `${symbol} ${formattedAmount}`;
  }

  // For most other currencies, put symbol after
  return `${formattedAmount} ${symbol}`;
}
