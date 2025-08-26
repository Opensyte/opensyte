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
