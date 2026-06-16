import * as React from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// Shared, branded, table-based, inline-styled layout for all invoice emails.
// Renders consistently in Gmail/Outlook. Fixed light design. English/LTR.

export interface InvoiceEmailLayoutProps {
  previewText: string;
  companyName: string;
  logoUrl?: string | null;
  /** Pre-interpolated intro message; blank lines become separate paragraphs. */
  message: string;
  children?: React.ReactNode;
  footerNote?: string | null;
}

export function InvoiceEmailLayout({
  previewText,
  companyName,
  logoUrl,
  message,
  children,
  footerNote,
}: InvoiceEmailLayoutProps) {
  const paragraphs = message.split(/\n{2,}/).filter(Boolean);
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            {logoUrl ? (
              <Img src={logoUrl} alt={companyName} height={40} style={logo} />
            ) : (
              <Text style={brand}>{companyName}</Text>
            )}
          </Section>

          <Section style={content}>
            {paragraphs.map((p, i) => (
              <Text key={i} style={paragraph}>
                {p}
              </Text>
            ))}
            {children}
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            {footerNote ?? `This email was sent by ${companyName}.`}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Reusable summary card + CTA building blocks for the concrete templates.
export interface SummaryRow {
  label: string;
  value: string;
  emphasize?: boolean;
}

export function SummaryCard({ rows }: { rows: SummaryRow[] }) {
  return (
    <Section style={card}>
      {rows.map((row, i) => (
        <table key={i} width="100%" style={cardRowTable}>
          <tbody>
            <tr>
              <td style={cardKey}>{row.label}</td>
              <td style={row.emphasize ? cardValStrong : cardVal}>{row.value}</td>
            </tr>
          </tbody>
        </table>
      ))}
    </Section>
  );
}

export function CtaButton({ href, label }: { href: string; label: string }) {
  return (
    <Section style={{ textAlign: "center", margin: "28px 0 8px" }}>
      <a href={href} style={button} target="_blank" rel="noreferrer">
        {label}
      </a>
    </Section>
  );
}

// Styles (inline)
const body: React.CSSProperties = {
  background: "#f3f4f6",
  fontFamily: "Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
};
const container: React.CSSProperties = {
  background: "#ffffff",
  margin: "0 auto",
  maxWidth: "600px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  overflow: "hidden",
};
const header: React.CSSProperties = {
  padding: "24px 32px",
  borderBottom: "1px solid #f0f1f3",
};
const logo: React.CSSProperties = { objectFit: "contain" };
const brand: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "#111827",
  margin: 0,
};
const content: React.CSSProperties = { padding: "8px 32px 4px" };
const paragraph: React.CSSProperties = {
  fontSize: 14,
  lineHeight: "22px",
  color: "#374151",
  margin: "16px 0 0",
};
const card: React.CSSProperties = {
  margin: "24px 0 4px",
  padding: "16px 20px",
  background: "#f9fafb",
  borderRadius: 8,
  border: "1px solid #eceef1",
};
const cardRowTable: React.CSSProperties = { borderCollapse: "collapse" };
const cardKey: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  padding: "5px 0",
  textAlign: "left",
};
const cardVal: React.CSSProperties = {
  fontSize: 13,
  color: "#111827",
  padding: "5px 0",
  textAlign: "right",
  fontWeight: 600,
};
const cardValStrong: React.CSSProperties = {
  ...cardVal,
  fontSize: 16,
  fontWeight: 700,
};
const button: React.CSSProperties = {
  display: "inline-block",
  background: "#2563eb",
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
  padding: "12px 28px",
  borderRadius: 8,
};
const hr: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid #f0f1f3",
  margin: "28px 0 0",
};
const footer: React.CSSProperties = {
  fontSize: 11,
  color: "#9ca3af",
  padding: "16px 32px 24px",
  margin: 0,
  textAlign: "center",
};
