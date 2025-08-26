import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface InviteEmailProps {
  organizationName: string;
  inviteeEmail: string;
  inviterName?: string | null;
  role: string;
  acceptUrl: string;
  expiresAt: string; // ISO date string
}

export function InviteEmail(props: InviteEmailProps) {
  const preview = `You're invited to ${props.organizationName}`;
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Join {props.organizationName}</Heading>
          <Text style={text}>
            {props.inviterName ?? "A teammate"} invited you to join{" "}
            <strong>{props.organizationName}</strong> as a
            <strong> {props.role.toLowerCase()}</strong>.
          </Text>
          <Section>
            <Link href={props.acceptUrl} style={button}>
              Accept invitation
            </Link>
          </Section>
          <Text style={small}>
            This invitation is sent to {props.inviteeEmail} and expires on{" "}
            {props.expiresAt}.
          </Text>
          <Hr style={hr} />
          <Text style={footnote}>
            If you didn’t expect this invite, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  background: "#f5f5f7",
  fontFamily: "Helvetica, Arial, sans-serif",
  margin: 0,
};
const container: React.CSSProperties = {
  background: "#ffffff",
  margin: "0 auto",
  padding: "32px 40px",
  maxWidth: "600px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
};
const heading: React.CSSProperties = {
  fontSize: 22,
  margin: "0 0 12px",
  fontWeight: 600,
};
const text: React.CSSProperties = {
  fontSize: 14,
  lineHeight: "20px",
  margin: "0 0 16px",
  color: "#111827",
};
const small: React.CSSProperties = {
  fontSize: 12,
  margin: "8px 0 0",
  color: "#6b7280",
};
const button: React.CSSProperties = {
  display: "inline-block",
  background: "#111827",
  color: "#ffffff",
  padding: "10px 16px",
  borderRadius: 6,
  textDecoration: "none",
  fontWeight: 600,
};
const hr: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid #e5e7eb",
  margin: "24px 0 0",
};
const footnote: React.CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
};

export default InviteEmail;
