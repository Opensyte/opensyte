// Editable email templates: variable interpolation + built-in defaults.
// Subjects and the intro "body" message support {variables}; the rest of each
// email (summary card, CTA button, footer) is fixed structure in the react-email
// template. English-only for now (i18n not yet integrated).

export type InvoiceEmailKind = "invoice" | "reminder" | "receipt";

export interface InvoiceEmailVars {
  clientName: string;
  invoiceNumber: string;
  amountDue: string; // already formatted in the invoice currency
  dueDate: string; // already formatted
  companyName: string;
  [key: string]: string;
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

export const DEFAULT_EMAIL_TEMPLATES: Record<InvoiceEmailKind, EmailTemplate> = {
  invoice: {
    subject: "Invoice {invoiceNumber} from {companyName}",
    body:
      "Hi {clientName},\n\n" +
      "Please find invoice {invoiceNumber} for {amountDue}, due on {dueDate}. " +
      "You can view and download a PDF copy using the button below.\n\n" +
      "Thank you for your business.",
  },
  reminder: {
    subject: "Reminder: invoice {invoiceNumber} is due",
    body:
      "Hi {clientName},\n\n" +
      "This is a friendly reminder that invoice {invoiceNumber} for {amountDue} " +
      "was due on {dueDate}. If you have already sent payment, please disregard " +
      "this message — otherwise you can view and pay it using the button below.",
  },
  receipt: {
    subject: "Payment received — invoice {invoiceNumber}",
    body:
      "Hi {clientName},\n\n" +
      "Thank you! We've recorded your payment for invoice {invoiceNumber}. " +
      "{companyName} appreciates your business. A copy of the invoice is attached " +
      "and available using the button below.",
  },
};

/** Replace {variable} tokens; unknown tokens are left intact. */
export function interpolate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) =>
    key in vars ? vars[key]! : `{${key}}`
  );
}
