// The canonical client-facing invoice document, rendered with @react-pdf/renderer.
// ONE definition powers: the in-app live preview (<PDFViewer>), the public page,
// one-click PDF download, and the email attachment (renderToBuffer). This keeps
// what the client sees on screen byte-identical to the downloaded/printed PDF.
//
// Fixed, print-friendly LIGHT theme — intentionally independent of the app's dark
// mode. English/LTR for now (i18n not yet integrated); currency/number/date are
// formatted via Intl so every country's currency renders correctly.
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatCurrency, formatDate, formatNumber } from "~/lib/invoice/format";

export interface InvoiceDocumentItem {
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  lineTotal: number | string;
}

export interface InvoiceDocumentData {
  // From (business identity)
  businessName: string;
  businessEmail?: string | null;
  businessPhone?: string | null;
  businessAddress?: string | null;
  businessWebsite?: string | null;
  logoUrl?: string | null;
  // Bill to
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  // Meta
  invoiceNumber: string;
  status: string;
  issueDate: string | Date;
  dueDate: string | Date;
  currency: string;
  locale?: string;
  paymentTerms?: string | null;
  taxRegistrationId?: string | null;
  // Line items
  items: InvoiceDocumentItem[];
  // Totals
  subtotal: number | string;
  discountAmount: number | string;
  taxEnabled: boolean;
  taxLabel: string;
  taxRate: number | string;
  taxAmount: number | string;
  shippingAmount: number | string;
  totalAmount: number | string;
  paidAmount: number | string;
  balanceDue: number | string;
  // Extras
  paymentInstructions?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  PAID: "Paid",
  PARTIALLY_PAID: "Partially Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

const COLORS = {
  text: "#1f2937",
  muted: "#6b7280",
  faint: "#9ca3af",
  line: "#e5e7eb",
  rowAlt: "#f9fafb",
  headBg: "#f3f4f6",
  accent: "#111827",
  brand: "#2563eb",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLORS.text,
    lineHeight: 1.4,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  fromBlock: { maxWidth: "55%" },
  logo: { maxWidth: 140, maxHeight: 48, marginBottom: 8, objectFit: "contain" },
  businessName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: COLORS.accent },
  metaLine: { fontSize: 9, color: COLORS.muted, marginTop: 1 },
  headerRight: { alignItems: "flex-end" },
  invoiceTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    letterSpacing: 1,
  },
  invoiceNumber: { fontSize: 10, color: COLORS.muted, marginTop: 2 },
  statusBadge: {
    marginTop: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: COLORS.headBg,
    color: COLORS.text,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Parties / meta
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  infoCol: { maxWidth: "48%" },
  sectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.faint,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  partyName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: COLORS.accent },
  partyLine: { fontSize: 9.5, color: COLORS.muted, marginTop: 1 },
  metaGrid: { alignItems: "flex-end" },
  metaPair: { flexDirection: "row", marginTop: 2 },
  metaKey: { fontSize: 9, color: COLORS.faint, width: 90, textAlign: "right", marginRight: 8 },
  metaVal: { fontSize: 9, fontFamily: "Helvetica-Bold", color: COLORS.text, textAlign: "right" },
  // Table
  table: { marginBottom: 16 },
  tHead: {
    flexDirection: "row",
    backgroundColor: COLORS.headBg,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  tRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  tRowAlt: { backgroundColor: COLORS.rowAlt },
  th: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: COLORS.muted, textTransform: "uppercase" },
  td: { fontSize: 9.5, color: COLORS.text },
  colDesc: { flex: 1, paddingRight: 8 },
  colQty: { width: 60, textAlign: "right" },
  colPrice: { width: 90, textAlign: "right" },
  colAmount: { width: 90, textAlign: "right" },
  // Totals
  totalsWrap: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 20 },
  totals: { width: 240 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalKey: { fontSize: 9.5, color: COLORS.muted },
  totalVal: { fontSize: 9.5, color: COLORS.text, fontFamily: "Helvetica-Bold" },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginTop: 4,
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  grandKey: { fontSize: 11, color: "#ffffff", fontFamily: "Helvetica-Bold" },
  grandVal: { fontSize: 11, color: "#ffffff", fontFamily: "Helvetica-Bold" },
  dueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.brand,
    borderRadius: 4,
  },
  dueKey: { fontSize: 10, color: COLORS.brand, fontFamily: "Helvetica-Bold" },
  dueVal: { fontSize: 10, color: COLORS.brand, fontFamily: "Helvetica-Bold" },
  // Blocks
  block: { marginTop: 14, padding: 10, backgroundColor: COLORS.rowAlt, borderRadius: 4 },
  blockText: { fontSize: 9, color: COLORS.muted, marginTop: 2 },
  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: COLORS.faint },
});

function isPositive(value: number | string): boolean {
  return Number(value) > 0.0001;
}

export function InvoiceDocument({ data }: { data: InvoiceDocumentData }) {
  const locale = data.locale ?? "en";
  const money = (v: number | string) => formatCurrency(v, data.currency, locale);
  const hasPaid = isPositive(data.paidAmount);

  return (
    <Document
      title={`Invoice ${data.invoiceNumber}`}
      author={data.businessName}
      subject={`Invoice ${data.invoiceNumber}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Header: business identity + INVOICE title */}
        <View style={styles.header}>
          <View style={styles.fromBlock}>
            {data.logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image style={styles.logo} src={data.logoUrl} />
            ) : null}
            <Text style={styles.businessName}>{data.businessName}</Text>
            {data.businessAddress ? (
              <Text style={styles.metaLine}>{data.businessAddress}</Text>
            ) : null}
            {data.businessEmail ? (
              <Text style={styles.metaLine}>{data.businessEmail}</Text>
            ) : null}
            {data.businessPhone ? (
              <Text style={styles.metaLine}>{data.businessPhone}</Text>
            ) : null}
            {data.businessWebsite ? (
              <Text style={styles.metaLine}>{data.businessWebsite}</Text>
            ) : null}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
            <Text style={styles.statusBadge}>
              {STATUS_LABELS[data.status] ?? data.status}
            </Text>
          </View>
        </View>

        {/* Bill To + dates */}
        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.sectionLabel}>Bill To</Text>
            {data.customerName ? (
              <Text style={styles.partyName}>{data.customerName}</Text>
            ) : null}
            {data.customerEmail ? (
              <Text style={styles.partyLine}>{data.customerEmail}</Text>
            ) : null}
            {data.customerPhone ? (
              <Text style={styles.partyLine}>{data.customerPhone}</Text>
            ) : null}
            {data.customerAddress ? (
              <Text style={styles.partyLine}>{data.customerAddress}</Text>
            ) : null}
          </View>
          <View style={styles.metaGrid}>
            <View style={styles.metaPair}>
              <Text style={styles.metaKey}>Issue Date</Text>
              <Text style={styles.metaVal}>{formatDate(data.issueDate, locale)}</Text>
            </View>
            <View style={styles.metaPair}>
              <Text style={styles.metaKey}>Due Date</Text>
              <Text style={styles.metaVal}>{formatDate(data.dueDate, locale)}</Text>
            </View>
            {data.paymentTerms ? (
              <View style={styles.metaPair}>
                <Text style={styles.metaKey}>Terms</Text>
                <Text style={styles.metaVal}>{data.paymentTerms}</Text>
              </View>
            ) : null}
            {data.taxRegistrationId ? (
              <View style={styles.metaPair}>
                <Text style={styles.metaKey}>Tax ID</Text>
                <Text style={styles.metaVal}>{data.taxRegistrationId}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Line items */}
        <View style={styles.table}>
          <View style={styles.tHead}>
            <Text style={[styles.th, styles.colDesc]}>Description</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.th, styles.colAmount]}>Amount</Text>
          </View>
          {data.items.map((item, i) => (
            <View
              key={i}
              style={i % 2 === 1 ? [styles.tRow, styles.tRowAlt] : styles.tRow}
              wrap={false}
            >
              <Text style={[styles.td, styles.colDesc]}>{item.description}</Text>
              <Text style={[styles.td, styles.colQty]}>
                {formatNumber(item.quantity, locale)}
              </Text>
              <Text style={[styles.td, styles.colPrice]}>{money(item.unitPrice)}</Text>
              <Text style={[styles.td, styles.colAmount]}>{money(item.lineTotal)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsWrap}>
          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalKey}>Subtotal</Text>
              <Text style={styles.totalVal}>{money(data.subtotal)}</Text>
            </View>
            {isPositive(data.discountAmount) ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalKey}>Discount</Text>
                <Text style={styles.totalVal}>-{money(data.discountAmount)}</Text>
              </View>
            ) : null}
            {data.taxEnabled ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalKey}>
                  {data.taxLabel} ({formatNumber(data.taxRate, locale)}%)
                </Text>
                <Text style={styles.totalVal}>{money(data.taxAmount)}</Text>
              </View>
            ) : null}
            {isPositive(data.shippingAmount) ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalKey}>Shipping</Text>
                <Text style={styles.totalVal}>{money(data.shippingAmount)}</Text>
              </View>
            ) : null}
            <View style={styles.grandRow}>
              <Text style={styles.grandKey}>Total</Text>
              <Text style={styles.grandVal}>{money(data.totalAmount)}</Text>
            </View>
            {hasPaid ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalKey}>Paid</Text>
                <Text style={styles.totalVal}>-{money(data.paidAmount)}</Text>
              </View>
            ) : null}
            {hasPaid ? (
              <View style={styles.dueRow}>
                <Text style={styles.dueKey}>Balance Due</Text>
                <Text style={styles.dueVal}>{money(data.balanceDue)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Payment instructions */}
        {data.paymentInstructions ? (
          <View style={styles.block}>
            <Text style={styles.sectionLabel}>Payment Instructions</Text>
            <Text style={styles.blockText}>{data.paymentInstructions}</Text>
          </View>
        ) : null}

        {/* Notes */}
        {data.notes ? (
          <View style={styles.block}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.blockText}>{data.notes}</Text>
          </View>
        ) : null}

        {/* Terms */}
        {data.termsAndConditions ? (
          <View style={styles.block}>
            <Text style={styles.sectionLabel}>Terms &amp; Conditions</Text>
            <Text style={styles.blockText}>{data.termsAndConditions}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {data.businessName} · Invoice {data.invoiceNumber}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export default InvoiceDocument;
