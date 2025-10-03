import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface InvoiceEmailItem {
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate?: string;
  discountRate?: string;
  lineTotal: string;
}

export interface InvoiceEmailProps {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: string;
  customerName?: string | null;
  customerEmail: string;
  customerAddress?: string | null;
  customerPhone?: string | null;
  organizationName: string;
  organizationWebsite?: string | null;
  organizationIndustry?: string | null;
  currency: string;
  items: InvoiceEmailItem[];
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  shippingAmount: string;
  totalAmount: string;
  paidAmount: string;
  paymentTerms?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;
  paymentUrl?: string;
}

export function InvoiceEmail(props: InvoiceEmailProps) {
  const preview = `Invoice ${props.invoiceNumber} - Total ${props.totalAmount} ${props.currency}`;
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Invoice #{props.invoiceNumber}</Heading>
          <Text style={meta}>
            <strong>Status:</strong> {props.status} |{" "}
            <strong>Issue Date:</strong> {props.issueDate} |{" "}
            <strong>Due Date:</strong> {props.dueDate} |{" "}
            <strong>Currency:</strong> {props.currency}
          </Text>
          <Section style={sectionRow}>
            <Section style={sectionCol}>
              <Text style={sectionTitle}>From</Text>
              <Text style={text}>
                {props.organizationName}
                {props.organizationWebsite && (
                  <>
                    <br />
                    Website: {props.organizationWebsite}
                  </>
                )}
                {props.organizationIndustry && (
                  <>
                    <br />
                    Industry: {props.organizationIndustry}
                  </>
                )}
              </Text>
            </Section>
            <Section style={sectionCol}>
              <Text style={sectionTitle}>Bill To</Text>
              <Text style={text}>
                {props.customerName && props.customerName}
                <br />
                {props.customerEmail}
                {props.customerPhone && (
                  <>
                    <br />
                    {props.customerPhone}
                  </>
                )}
                {props.customerAddress && (
                  <>
                    <br />
                    {props.customerAddress}
                  </>
                )}
              </Text>
            </Section>
          </Section>
          <Hr style={hr} />
          <table style={table}>
            <tr style={tableHeadRow}>
              <th style={thDesc}>Description</th>
              <th style={th}>Qty</th>
              <th style={th}>Unit Price ({props.currency})</th>
              <th style={th}>Tax %</th>
              <th style={th}>Disc %</th>
              <th style={thLast}>Line Total ({props.currency})</th>
            </tr>
            {props.items.map((item, i) => (
              <tr key={i} style={i % 2 ? tableRowAlt : tableRow}>
                <td style={tdDesc}>{item.description}</td>
                <td style={td}>{item.quantity}</td>
                <td style={td}>{item.unitPrice}</td>
                <td style={td}>{item.taxRate ?? "0"}</td>
                <td style={td}>{item.discountRate ?? "0"}</td>
                <td style={tdLast}>{item.lineTotal}</td>
              </tr>
            ))}
          </table>
          <Section style={totals}>
            <Text style={totalLine}>
              Subtotal:{" "}
              <strong>
                {props.subtotal} {props.currency}
              </strong>
            </Text>
            <Text style={totalLine}>
              Tax:{" "}
              <strong>
                {props.taxAmount} {props.currency}
              </strong>
            </Text>
            {props.discountAmount !== "0" &&
              props.discountAmount !== "0.00" && (
                <Text style={totalLine}>
                  Discount:{" "}
                  <strong>
                    -{props.discountAmount} {props.currency}
                  </strong>
                </Text>
              )}
            {props.shippingAmount !== "0" &&
              props.shippingAmount !== "0.00" && (
                <Text style={totalLine}>
                  Shipping:{" "}
                  <strong>
                    {props.shippingAmount} {props.currency}
                  </strong>
                </Text>
              )}
            <Text style={grandTotal}>
              Total:{" "}
              <strong>
                {props.totalAmount} {props.currency}
              </strong>
            </Text>
            {props.paidAmount !== "0" && props.paidAmount !== "0.00" && (
              <Text style={totalLine}>
                Paid:{" "}
                <strong>
                  {props.paidAmount} {props.currency}
                </strong>
              </Text>
            )}
            {props.paidAmount !== "0" && props.paidAmount !== "0.00" && (
              <Text style={grandTotal}>
                Amount Due:{" "}
                <strong>
                  {(
                    parseFloat(props.totalAmount) - parseFloat(props.paidAmount)
                  ).toFixed(2)}{" "}
                  {props.currency}
                </strong>
              </Text>
            )}
          </Section>
          {props.paymentUrl && (
            <Section style={paymentSection}>
              <Button href={props.paymentUrl} style={paymentButton}>
                Pay Invoice Online
              </Button>
              <Text style={paymentText}>
                Click the button above to pay securely with credit card
              </Text>
            </Section>
          )}
          {props.paymentTerms && (
            <Text style={small}>Payment Terms: {props.paymentTerms}</Text>
          )}
          {props.notes && <Text style={small}>Notes: {props.notes}</Text>}
          {props.termsAndConditions && (
            <Text style={small}>
              Terms & Conditions: {props.termsAndConditions}
            </Text>
          )}
          <Hr style={hr} />
          <Text style={footer}>
            This invoice was generated electronically and contains all required
            tax information. Please retain this document for your records as it
            may be required for tax compliance purposes. Invoice issued on{" "}
            {props.issueDate} by {props.organizationName}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const body: React.CSSProperties = {
  background: "#f5f5f7",
  fontFamily: "Helvetica, Arial, sans-serif",
  margin: 0,
};
const container: React.CSSProperties = {
  background: "#ffffff",
  margin: "0 auto",
  padding: "32px 40px",
  maxWidth: "720px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
};
const heading: React.CSSProperties = {
  fontSize: 24,
  margin: "0 0 8px",
  fontWeight: 600,
};
const meta: React.CSSProperties = {
  fontSize: 13,
  color: "#374151",
  margin: "0 0 24px",
};
const sectionRow: React.CSSProperties = {
  display: "flex",
  gap: 32,
  width: "100%",
  flexWrap: "wrap",
  marginBottom: 24,
};
const sectionCol: React.CSSProperties = { flex: "1 1 240px", minWidth: 240 };
const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: ".05em",
  color: "#6b7280",
  margin: "0 0 4px",
  fontWeight: 600,
};
const text: React.CSSProperties = {
  fontSize: 14,
  lineHeight: "20px",
  margin: 0,
  color: "#111827",
};
const hr: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid #e5e7eb",
  margin: "24px 0",
};
const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  marginTop: 4,
};
const tableHeadRow: React.CSSProperties = { background: "#f3f4f6" };
const thBase: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontWeight: 600,
  borderBottom: "1px solid #e5e7eb",
  fontSize: 12,
  color: "#374151",
};
const th: React.CSSProperties = { ...thBase };
const thLast: React.CSSProperties = { ...thBase };
const thDesc: React.CSSProperties = { ...thBase, width: "40%" };
const tdBase: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid #f0f1f3",
  verticalAlign: "top",
};
const td: React.CSSProperties = { ...tdBase, whiteSpace: "nowrap" };
const tdLast: React.CSSProperties = {
  ...tdBase,
  textAlign: "right",
  whiteSpace: "nowrap",
};
const tdDesc: React.CSSProperties = { ...tdBase };
const tableRow: React.CSSProperties = { background: "#ffffff" };
const tableRowAlt: React.CSSProperties = { background: "#fafafa" };
const totals: React.CSSProperties = { marginTop: 24 };
const totalLine: React.CSSProperties = {
  fontSize: 13,
  margin: "2px 0",
  color: "#374151",
};
const grandTotal: React.CSSProperties = {
  fontSize: 15,
  margin: "8px 0 0",
  color: "#111827",
};
const small: React.CSSProperties = {
  fontSize: 12,
  margin: "12px 0 0",
  color: "#4b5563",
};
const footer: React.CSSProperties = {
  fontSize: 11,
  margin: "16px 0 0",
  color: "#6b7280",
  lineHeight: "16px",
};
const paymentSection: React.CSSProperties = {
  margin: "32px 0",
  textAlign: "center",
};
const paymentButton: React.CSSProperties = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center",
  display: "inline-block",
  padding: "12px 32px",
  margin: "0 auto",
};
const paymentText: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  margin: "12px 0 0",
};

export default InvoiceEmail;
