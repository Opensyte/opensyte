// Single source of truth for invoice money math.
// Isomorphic (server + client preview) and Decimal-only — never floats.
// Prisma.Decimal is decimal.js under the hood, so we use decimal.js directly
// and convert to Prisma.Decimal at the persistence boundary in the router.
import Decimal from "decimal.js";

export interface CalcLineInput {
  quantity: Decimal.Value;
  unitPrice: Decimal.Value;
}

export interface CalcInput {
  items: CalcLineInput[];
  discountAmount?: Decimal.Value; // invoice-level fixed discount
  taxEnabled?: boolean;
  taxRate?: Decimal.Value; // percent, applied to taxable base
  shippingAmount?: Decimal.Value;
  paidAmount?: Decimal.Value;
}

export interface CalcResult {
  lineSubtotals: Decimal[];
  subtotal: Decimal;
  discountAmount: Decimal;
  taxableBase: Decimal;
  taxAmount: Decimal;
  shippingAmount: Decimal;
  totalAmount: Decimal;
  paidAmount: Decimal;
  balanceDue: Decimal;
}

const ZERO = new Decimal(0);

function d(value: Decimal.Value | undefined): Decimal {
  if (value === undefined || value === null || value === "") return ZERO;
  try {
    return new Decimal(value);
  } catch {
    return ZERO;
  }
}

/** Round to 2 decimal places (currency minor units). */
function money(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Compute all invoice totals from raw inputs.
 *   lineSubtotal = qty * unitPrice
 *   subtotal     = Σ lineSubtotal
 *   taxableBase  = max(subtotal - discount, 0)
 *   taxAmount    = taxEnabled ? taxableBase * taxRate/100 : 0
 *   total        = taxableBase + taxAmount + shipping
 *   balanceDue   = total - paid
 */
export function calculateInvoiceTotals(input: CalcInput): CalcResult {
  const lineSubtotals = input.items.map(item => money(d(item.quantity).mul(d(item.unitPrice))));

  const subtotal = money(lineSubtotals.reduce((sum, line) => sum.add(line), ZERO));

  const discountAmount = money(Decimal.min(d(input.discountAmount), subtotal));
  const taxableBase = money(Decimal.max(subtotal.sub(discountAmount), ZERO));

  const taxAmount = money(
    input.taxEnabled === false ? ZERO : taxableBase.mul(d(input.taxRate)).div(100)
  );

  const shippingAmount = money(d(input.shippingAmount));
  const totalAmount = money(taxableBase.add(taxAmount).add(shippingAmount));
  const paidAmount = money(d(input.paidAmount));
  const balanceDue = money(totalAmount.sub(paidAmount));

  return {
    lineSubtotals,
    subtotal,
    discountAmount,
    taxableBase,
    taxAmount,
    shippingAmount,
    totalAmount,
    paidAmount,
    balanceDue,
  };
}

/** Convenience: balance due from a total/paid pair, as a Decimal. */
export function balanceDue(total: Decimal.Value, paid: Decimal.Value): Decimal {
  return money(d(total).sub(d(paid)));
}
