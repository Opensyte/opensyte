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
import * as React from "react";

interface EarlyAccessReminderEmailProps {
  code: string;
  recipientEmail: string;
  platformUrl: string;
}

export const EarlyAccessReminderEmail = ({
  code,
  recipientEmail,
  platformUrl,
}: EarlyAccessReminderEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        Don&apos;t miss out on OpenSyte Early Access! Your code: {code}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}

          {/* Hero Section */}
          <Section style={heroSection}>
            <Heading style={heroHeading}>
              ⏰ Don&apos;t Miss Out on OpenSyte Early Access!
            </Heading>
            <Text style={heroText}>
              This is a friendly reminder about your early access invitation to{" "}
              <strong>OpenSyte</strong>. Your registration code is still
              available and ready to use!
            </Text>
            <Text style={heroSubtext}>
              Join other beta users who are already exploring the future of
              business management software.
            </Text>
          </Section>

          {/* Registration Code Section */}
          <Section style={codeSection}>
            <Heading style={codeHeading}>Your Registration Code</Heading>
            <div style={codeContainer}>
              <Text style={codeText}>{code}</Text>
            </div>
            <Text style={codeSubtext}>
              This code is still valid and waiting for you to use it
            </Text>
          </Section>

          {/* CTA Button */}
          <Section style={buttonSection}>
            <Button style={button} href={platformUrl}>
              🔓 Access Platform Now
            </Button>
            <Text style={buttonSubtext}>
              Your registration code is ready to use!
            </Text>
          </Section>

          {/* Quick Start Guide */}
          <Section style={quickStartSection}>
            <Heading style={quickStartHeading}>Quick Start Guide:</Heading>
            <div style={quickStartList}>
              <div style={quickStartItem}>
                <Text style={quickStartNumber}>1</Text>
                <Text style={quickStartText}>
                  Click the button above to visit the OpenSyte platform
                </Text>
              </div>
              <div style={quickStartItem}>
                <Text style={quickStartNumber}>2</Text>
                <Text style={quickStartText}>
                  Enter your registration code when prompted
                </Text>
              </div>
              <div style={quickStartItem}>
                <Text style={quickStartNumber}>3</Text>
                <Text style={quickStartText}>
                  Start exploring all the features!
                </Text>
              </div>
            </div>
          </Section>

          {/* Why Join Now Section */}
          <Section style={benefitsSection}>
            <Heading style={benefitsHeading}>Why join the beta now?</Heading>
            <div style={benefitsList}>
              <div style={benefitItem}>
                <Text style={benefitIcon}>🚀</Text>
                <div>
                  <Text style={benefitTitle}>Early access</Text>
                  <Text style={benefitDescription}>
                    to cutting-edge business management features
                  </Text>
                </div>
              </div>
              <div style={benefitItem}>
                <Text style={benefitIcon}>💡</Text>
                <div>
                  <Text style={benefitTitle}>Direct influence</Text>
                  <Text style={benefitDescription}>
                    on product development through your feedback
                  </Text>
                </div>
              </div>
              <div style={benefitItem}>
                <Text style={benefitIcon}>🎯</Text>
                <div>
                  <Text style={benefitTitle}>Priority support</Text>
                  <Text style={benefitDescription}>
                    from our development team
                  </Text>
                </div>
              </div>
              <div style={benefitItem}>
                <Text style={benefitIcon}>🔮</Text>
                <div>
                  <Text style={benefitTitle}>Exclusive insights</Text>
                  <Text style={benefitDescription}>
                    into upcoming features and improvements
                  </Text>
                </div>
              </div>
            </div>
          </Section>

          <Hr style={hr} />

          {/* Support Section */}
          <Section style={supportSection}>
            <Heading style={supportHeading}>Questions or Issues?</Heading>
            <Text style={supportText}>
              If you&apos;re having trouble accessing the platform or have any
              questions about the beta, our team is ready to help you get
              started.
            </Text>
            <Text style={recipientInfo}>
              This reminder was sent to: <strong>{recipientEmail}</strong>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Best regards,
              <br />
              <strong>The OpenSyte Team</strong>
            </Text>
            <Text style={footerBrand}>
              OpenSyte - Open Source Business Management Platform
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default EarlyAccessReminderEmail;

// Styles using Tailwind-inspired design tokens with amber/orange theme for urgency
const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "600px",
};

const heroSection = {
  textAlign: "center" as const,
  marginBottom: "40px",
};

const heroHeading = {
  fontSize: "28px",
  fontWeight: "700",
  color: "#1f2937",
  margin: "0 0 20px 0",
  lineHeight: "1.2",
};

const heroText = {
  fontSize: "16px",
  color: "#4b5563",
  lineHeight: "1.6",
  margin: "0 0 20px 0",
};

const heroSubtext = {
  fontSize: "16px",
  color: "#4b5563",
  lineHeight: "1.6",
  margin: "0",
};

const codeSection = {
  textAlign: "center" as const,
  margin: "40px 0",
  padding: "30px",
  backgroundColor: "#fef3c7",
  borderRadius: "12px",
  border: "1px solid #f59e0b",
};

const codeHeading = {
  fontSize: "20px",
  fontWeight: "600",
  color: "#92400e",
  margin: "0 0 20px 0",
};

const codeContainer = {
  backgroundColor: "#ffffff",
  padding: "20px",
  borderRadius: "8px",
  border: "2px solid #f59e0b",
  display: "inline-block",
  margin: "10px 0",
};

const codeText = {
  fontSize: "32px",
  fontWeight: "700",
  color: "#d97706",
  letterSpacing: "4px",
  fontFamily: '"Courier New", monospace',
  margin: "0",
};

const codeSubtext = {
  fontSize: "14px",
  color: "#92400e",
  margin: "15px 0 0 0",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "40px 0",
};

const button = {
  backgroundColor: "#f59e0b",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "16px 32px",
  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
};

const buttonSubtext = {
  fontSize: "14px",
  color: "#92400e",
  margin: "15px 0 0 0",
};

const quickStartSection = {
  margin: "40px 0",
};

const quickStartHeading = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#0c4a6e",
  margin: "0 0 15px 0",
};

const quickStartList = {
  backgroundColor: "#f0f9ff",
  padding: "25px",
  borderRadius: "8px",
  borderLeft: "4px solid #0ea5e9",
};

const quickStartItem = {
  display: "flex",
  alignItems: "flex-start",
  marginBottom: "10px",
};

const quickStartNumber = {
  backgroundColor: "#0ea5e9",
  color: "#ffffff",
  borderRadius: "50%",
  width: "20px",
  height: "20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "600",
  marginRight: "12px",
  flexShrink: "0",
  textAlign: "center" as const,
  lineHeight: "20px",
};

const quickStartText = {
  fontSize: "15px",
  color: "#075985",
  margin: "0",
  lineHeight: "1.5",
};

const benefitsSection = {
  margin: "40px 0",
};

const benefitsHeading = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 20px 0",
};

const benefitsList = {
  backgroundColor: "#f9fafb",
  padding: "20px",
  borderRadius: "8px",
};

const benefitItem = {
  display: "flex",
  alignItems: "flex-start",
  marginBottom: "15px",
};

const benefitIcon = {
  fontSize: "20px",
  marginRight: "12px",
  flexShrink: "0",
};

const benefitTitle = {
  fontSize: "15px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 2px 0",
};

const benefitDescription = {
  fontSize: "14px",
  color: "#4b5563",
  margin: "0",
  lineHeight: "1.4",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "40px 0",
};

const supportSection = {
  backgroundColor: "#f8fafc",
  padding: "25px",
  borderRadius: "8px",
  textAlign: "center" as const,
  margin: "40px 0",
};

const supportHeading = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 15px 0",
};

const supportText = {
  fontSize: "15px",
  color: "#6b7280",
  margin: "0 0 20px 0",
  lineHeight: "1.5",
};

const recipientInfo = {
  fontSize: "14px",
  color: "#9ca3af",
  margin: "0",
};

const footer = {
  textAlign: "center" as const,
  marginTop: "40px",
  paddingTop: "30px",
  borderTop: "1px solid #e5e7eb",
};

const footerText = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 10px 0",
};

const footerBrand = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: "20px 0 0 0",
};
