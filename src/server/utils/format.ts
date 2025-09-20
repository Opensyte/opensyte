import type { Prisma } from "@prisma/client";

/**
 * Format a Prisma Decimal or number to a string with proper decimal places
 */
export function formatDecimalLike(
  value: Prisma.Decimal | number | string
): string {
  if (typeof value === "string") {
    return parseFloat(value).toFixed(2);
  }
  if (typeof value === "number") {
    return value.toFixed(2);
  }
  return value.toFixed(2);
}

/**
 * Format currency values based on currency type
 */
export function formatCurrency(
  value: Prisma.Decimal | number | string,
  currency: string
): string {
  const numValue =
    typeof value === "string" ? parseFloat(value) : Number(value);

  if (currency === "IDR") {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numValue);
  }

  // Default formatting for other currencies
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
}

/**
 * Format decimal values for display (quantities, rates, etc.)
 */
export function formatDecimal(
  value: Prisma.Decimal | number | string,
  decimals = 2
): string {
  const numValue =
    typeof value === "string" ? parseFloat(value) : Number(value);
  return numValue.toFixed(decimals);
}
