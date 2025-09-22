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

interface EarlyAccessInvitationEmailProps {
  code: string;
  recipientEmail: string;
  platformUrl: string;
}

export const EarlyAccessInvitationEmail = ({
  code,
  recipientEmail,
  platformUrl,
}: EarlyAccessInvitationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        Welcome to OpenSyte Early Access! Your registration code: {code}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}

          {/* Hero Section */}
          <Section style={heroSection}>
            <Heading style={heroHeading}>
              🎉 Welcome to OpenSyte Early Access!
            </Heading>
            <Text style={heroText}>
              Congratulations! You&apos;ve been invited to join the early access
              beta of <strong>OpenSyte</strong>, the open-source all-in-one
              business management platform.
            </Text>
          </Section>

          {/* Registration Code Section */}
          <Section style={codeSection}>
            <Heading style={codeHeading}>Your Registration Code</Heading>
            <div style={codeContainer}>
              <Text style={codeText}>{code}</Text>
            </div>
            <Text style={codeSubtext}>
              Keep this code secure - you&apos;ll need it to access the platform
            </Text>
          </Section>

          {/* CTA Button */}
          <Section style={buttonSection}>
            <Button style={button} href={platformUrl}>
              🚀 Access OpenSyte Platform
            </Button>
            <Text style={buttonSubtext}>
              Click the button above to get started with your early access
            </Text>
          </Section>

          {/* Getting Started Steps */}
          <Section style={stepsSection}>
            <Heading style={stepsHeading}>Getting Started:</Heading>
            <div style={stepsList}>
              <div style={stepItem}>
                <Text style={stepNumber}>1</Text>
                <Text style={stepText}>
                  <strong>Click the button above</strong> to visit the OpenSyte
                  platform
                </Text>
              </div>
              <div style={stepItem}>
                <Text style={stepNumber}>2</Text>
                <Text style={stepText}>
                  <strong>Create your account</strong> or sign in if you already
                  have one
                </Text>
              </div>
              <div style={stepItem}>
                <Text style={stepNumber}>3</Text>
                <Text style={stepText}>
                  <strong>Enter your registration code</strong> when prompted
                  during onboarding
                </Text>
              </div>
              <div style={stepItem}>
                <Text style={stepNumber}>4</Text>
                <Text style={stepText}>
                  <strong>Explore the features</strong> and start managing your
                  business operations
                </Text>
              </div>
            </div>
          </Section>

          {/* Features Grid */}
          <Section style={featuresSection}>
            <Heading style={featuresHeading}>
              What you&apos;ll get access to:
            </Heading>
            <div style={featuresGrid}>
              <div style={featureCard}>
                <Text style={featureIcon}>🏢</Text>
                <Text style={featureTitle}>CRM & Customer Management</Text>
                <Text style={featureDescription}>
                  Track leads, manage contacts, and grow your customer
                  relationships
                </Text>
              </div>
              <div style={featureCard}>
                <Text style={featureIcon}>📊</Text>
                <Text style={featureTitle}>Project Management</Text>
                <Text style={featureDescription}>
                  Organize tasks, track progress, and collaborate with your team
                </Text>
              </div>
              <div style={featureCard}>
                <Text style={featureIcon}>💰</Text>
                <Text style={featureTitle}>Finance & Accounting</Text>
                <Text style={featureDescription}>
                  Handle invoicing, expenses, and financial reporting
                </Text>
              </div>
              <div style={featureCard}>
                <Text style={featureIcon}>⚡</Text>
                <Text style={featureTitle}>Workflow Automation</Text>
                <Text style={featureDescription}>
                  Automate repetitive tasks and streamline your processes
                </Text>
              </div>
            </div>
          </Section>

          <Hr style={hr} />

          {/* Support Section */}
          <Section style={supportSection}>
            <Heading style={supportHeading}>Need Help?</Heading>
            <Text style={supportText}>
              Our team is here to support you during the beta. If you have any
              questions, encounter issues, or want to share feedback, don&apos;t
              hesitate to reach out.
            </Text>
            <Text style={recipientInfo}>
              This invitation was sent to: <strong>{recipientEmail}</strong>
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

export default EarlyAccessInvitationEmail;

// Styles using Tailwind-inspired design tokens
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

const codeSection = {
  textAlign: "center" as const,
  margin: "40px 0",
  padding: "30px",
  backgroundColor: "#f8fafc",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
};

const codeHeading = {
  fontSize: "20px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 20px 0",
};

const codeContainer = {
  backgroundColor: "#ffffff",
  padding: "20px",
  borderRadius: "8px",
  border: "2px solid #3b82f6",
  display: "inline-block",
  margin: "10px 0",
};

const codeText = {
  fontSize: "32px",
  fontWeight: "700",
  color: "#1d4ed8",
  letterSpacing: "4px",
  fontFamily: '"Courier New", monospace',
  margin: "0",
};

const codeSubtext = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "15px 0 0 0",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "40px 0",
};

const button = {
  backgroundColor: "#3b82f6",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "16px 32px",
  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
};

const buttonSubtext = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "15px 0 0 0",
};

const stepsSection = {
  margin: "40px 0",
};

const stepsHeading = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 20px 0",
};

const stepsList = {
  backgroundColor: "#f9fafb",
  padding: "25px",
  borderRadius: "8px",
  borderLeft: "4px solid #3b82f6",
};

const stepItem = {
  display: "flex",
  alignItems: "flex-start",
  marginBottom: "15px",
};

const stepNumber = {
  backgroundColor: "#3b82f6",
  color: "#ffffff",
  borderRadius: "50%",
  width: "24px",
  height: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "600",
  marginRight: "12px",
  flexShrink: "0",
  textAlign: "center" as const,
  lineHeight: "24px",
};

const stepText = {
  fontSize: "15px",
  color: "#4b5563",
  margin: "0",
  lineHeight: "1.5",
};

const featuresSection = {
  margin: "40px 0",
};

const featuresHeading = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 20px 0",
};

const featuresGrid = {
  display: "grid",
  gap: "15px",
};

const featureCard = {
  display: "flex",
  alignItems: "flex-start",
  padding: "15px",
  backgroundColor: "#f0f9ff",
  borderRadius: "8px",
  borderLeft: "3px solid #0ea5e9",
};

const featureIcon = {
  fontSize: "20px",
  marginRight: "15px",
  flexShrink: "0",
};

const featureTitle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#0c4a6e",
  margin: "0 0 4px 0",
};

const featureDescription = {
  fontSize: "14px",
  color: "#075985",
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
