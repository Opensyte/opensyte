import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { TemplateManifest } from "~/types/templates";
import type {
  TemplatePackage,
  TemplateShare,
  TemplateShareStatus,
  TemplateShareAccessAction,
  TemplateShareAccessStatus,
} from "@prisma/client";

// Constants for sharing system
export const SHARE_CONFIG = {
  TOKEN_LENGTH: 32, // Length of raw token in bytes
  TOKEN_ENCODING: "base64url" as const,
  SNAPSHOT_VERSION: "1.0.0",
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_NOTES_LENGTH: 1000,
  DEFAULT_EXPIRATION_DAYS: 30,
  MAX_EXPIRATION_DAYS: 365,
  MAX_USAGE_LIMIT: 1000,
} as const;

// Validation schemas
export const CreateShareInputSchema = z.object({
  templatePackageId: z.string().cuid(),
  organizationId: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  shareMode: z.enum(["LINK", "EMAIL", "MIXED"]).default("LINK"),
  expiresAt: z.date().optional(),
  maxUses: z.number().int().min(1).max(SHARE_CONFIG.MAX_USAGE_LIMIT).optional(),
  notes: z.string().max(SHARE_CONFIG.MAX_NOTES_LENGTH).optional(),
  recipientEmails: z.array(z.string().email()).optional(),
});

export const ShareTokenSchema = z.object({
  shareId: z.string().cuid(),
  rawToken: z.string(),
});

export type CreateShareInput = z.infer<typeof CreateShareInputSchema>;
export type ShareToken = z.infer<typeof ShareTokenSchema>;

// Share snapshot data structure
export interface ShareSnapshot {
  version: string;
  capturedAt: string;
  packageInfo: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    version: string;
    iconUrl: string | null;
    tags: string[];
  };
  manifest: TemplateManifest;
  organizationInfo: {
    id: string;
    name: string;
    logo: string | null;
  };
  metadata: {
    totalAssets: number;
    assetCounts: {
      workflows: number;
      actionTemplates: number;
      reports: number;
      projects: number;
      invoices: number;
      roles: number;
      variables: number;
    };
    requiredPermissions: string[];
    compatibleModules: string[];
  };
}

// Share status computation interface
export interface ShareStatusInfo {
  status: TemplateShareStatus;
  isAccessible: boolean;
  canImport: boolean;
  message: string;
  details?: {
    usageRemaining?: number;
    expiresAt?: Date;
  };
}

/**
 * Token generation and validation utilities
 */
export class ShareTokenService {
  /**
   * Generate a cryptographically secure token for share links
   */
  static generateToken(): string {
    return randomBytes(SHARE_CONFIG.TOKEN_LENGTH).toString(
      SHARE_CONFIG.TOKEN_ENCODING
    );
  }

  /**
   * Hash a token for secure database storage
   */
  static hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * Verify a token against a hash
   */
  static verifyToken(token: string, hash: string): boolean {
    return this.hashToken(token) === hash;
  }

  /**
   * Generate a secure share URL
   */
  static generateShareUrl(baseUrl: string, token: string): string {
    return `${baseUrl}/shared/templates/${token}`;
  }

  /**
   * Extract token from a share URL
   */
  static extractTokenFromUrl(url: string): string | null {
    const match = /\/shared\/templates\/([^/?]+)/.exec(url);
    return match?.[1] ?? null;
  }
}

/**
 * Snapshot creation and validation utilities
 */
export class SnapshotService {
  /**
   * Create an immutable snapshot of a template package
   */
  static createSnapshot(
    templatePackage: TemplatePackage & {
      organization: { id: string; name: string; logo: string | null } | null;
    },
    manifest: TemplateManifest
  ): ShareSnapshot {
    // Calculate asset counts
    const assetCounts = {
      workflows: manifest.assets.workflows?.length ?? 0,
      actionTemplates: manifest.assets.actionTemplates?.length ?? 0,
      reports: manifest.assets.reports?.length ?? 0,
      projects: manifest.assets.projects?.length ?? 0,
      invoices: manifest.assets.invoices?.length ?? 0,
      roles: manifest.assets.rbac?.roles?.length ?? 0,
      variables: manifest.requires.variables?.length ?? 0,
    };

    // Extract required permissions
    const requiredPermissions = manifest.requires.permissions ?? [];

    // Determine compatible modules based on assets
    const compatibleModules = this.determineCompatibleModules(manifest);

    return {
      version: SHARE_CONFIG.SNAPSHOT_VERSION,
      capturedAt: new Date().toISOString(),
      packageInfo: {
        id: templatePackage.id,
        name: templatePackage.name,
        description: templatePackage.description,
        category: templatePackage.category,
        version: templatePackage.version,
        iconUrl: templatePackage.iconUrl,
        tags: Array.isArray(templatePackage.tags)
          ? (templatePackage.tags as string[])
          : [],
      },
      manifest,
      organizationInfo: {
        id: templatePackage.organization?.id ?? "",
        name: templatePackage.organization?.name ?? "Unknown Organization",
        logo: templatePackage.organization?.logo ?? null,
      },
      metadata: {
        totalAssets: Object.values(assetCounts).reduce(
          (sum, count) => sum + count,
          0
        ),
        assetCounts,
        requiredPermissions,
        compatibleModules,
      },
    };
  }

  /**
   * Validate a snapshot structure
   */
  static validateSnapshot(data: unknown): data is ShareSnapshot {
    try {
      const snapshot = data as ShareSnapshot;
      return (
        typeof snapshot.version === "string" &&
        typeof snapshot.capturedAt === "string" &&
        typeof snapshot.packageInfo === "object" &&
        typeof snapshot.manifest === "object" &&
        typeof snapshot.organizationInfo === "object" &&
        typeof snapshot.metadata === "object"
      );
    } catch {
      return false;
    }
  }

  /**
   * Extract public-safe data from a snapshot for preview
   */
  static extractPreviewData(snapshot: ShareSnapshot) {
    return {
      packageInfo: snapshot.packageInfo,
      organizationInfo: {
        name: snapshot.organizationInfo.name,
        logo: snapshot.organizationInfo.logo,
      },
      metadata: snapshot.metadata,
      capturedAt: snapshot.capturedAt,
    };
  }

  /**
   * Determine compatible modules based on manifest assets
   */
  private static determineCompatibleModules(
    manifest: TemplateManifest
  ): string[] {
    const modules = new Set<string>();

    // Check workflows for CRM/Project/Finance/HR indicators
    manifest.assets.workflows?.forEach(workflowAsset => {
      if (workflowAsset.workflow.category) {
        modules.add(workflowAsset.workflow.category.toLowerCase());
      }
    });

    // Check action templates
    manifest.assets.actionTemplates?.forEach(template => {
      if (template.category) {
        modules.add(template.category.toLowerCase());
      }
    });

    // Check reports
    if (manifest.assets.reports && manifest.assets.reports.length > 0) {
      modules.add("finance");
    }

    // Check projects
    if (manifest.assets.projects && manifest.assets.projects.length > 0) {
      modules.add("projects");
    }

    // Check invoices
    if (manifest.assets.invoices && manifest.assets.invoices.length > 0) {
      modules.add("finance");
    }

    return Array.from(modules);
  }
}

/**
 * Share access validation and status computation
 */
export class ShareAccessService {
  /**
   * Compute the current status of a share
   */
  static computeShareStatus(share: TemplateShare): ShareStatusInfo {
    const now = new Date();

    // Check if revoked
    if (share.status === "REVOKED") {
      return {
        status: "REVOKED",
        isAccessible: false,
        canImport: false,
        message: "This share has been revoked and is no longer accessible.",
      };
    }

    // Check if expired
    if (share.expiresAt && now > share.expiresAt) {
      return {
        status: "EXPIRED",
        isAccessible: true, // Can still preview
        canImport: false,
        message: "This share has expired and can no longer be imported.",
        details: { expiresAt: share.expiresAt },
      };
    }

    // Check if usage limit exhausted
    if (share.maxUses && share.usageCount >= share.maxUses) {
      return {
        status: "EXHAUSTED",
        isAccessible: true, // Can still preview
        canImport: false,
        message:
          "This share has reached its usage limit and can no longer be imported.",
        details: { usageRemaining: 0 },
      };
    }

    // Active share
    const usageRemaining = share.maxUses
      ? share.maxUses - share.usageCount
      : undefined;
    return {
      status: "ACTIVE",
      isAccessible: true,
      canImport: true,
      message: "This share is active and available for import.",
      details: {
        usageRemaining,
        expiresAt: share.expiresAt ?? undefined,
      },
    };
  }

  /**
   * Validate access for email-based shares
   */
  static validateEmailAccess(
    share: TemplateShare & {
      recipients: Array<{ email: string; status: string }>;
    },
    userEmail: string
  ): { allowed: boolean; reason?: string } {
    if (share.shareMode === "LINK") {
      return { allowed: true }; // Link shares don't restrict by email
    }

    // Check if email is in recipient list
    const recipient = share.recipients.find(
      r => r.email.toLowerCase() === userEmail.toLowerCase()
    );

    if (!recipient) {
      return {
        allowed: false,
        reason:
          "Your email address is not in the recipient list for this share.",
      };
    }

    return { allowed: true };
  }

  /**
   * Check if a user can import based on organization membership and permissions
   */
  static validateImportPermissions(
    userRole: string | null,
    targetOrganizationId: string,
    userOrganizations: Array<{ organizationId: string; role: string | null }>
  ): { allowed: boolean; reason?: string } {
    // Check if user is member of target organization
    const membership = userOrganizations.find(
      org => org.organizationId === targetOrganizationId
    );

    if (!membership) {
      return {
        allowed: false,
        reason:
          "You must be a member of the target organization to import templates.",
      };
    }

    // Check if user has template write permissions
    // This would need to integrate with the actual RBAC system
    const hasWritePermission = this.checkTemplateWritePermission(
      membership.role
    );

    if (!hasWritePermission) {
      return {
        allowed: false,
        reason:
          "You don't have permission to import templates in this organization.",
      };
    }

    return { allowed: true };
  }

  /**
   * Placeholder for template write permission check
   * This should integrate with the actual RBAC system
   */
  private static checkTemplateWritePermission(role: string | null): boolean {
    if (!role) return false;

    // This is a simplified check - in real implementation, this should use the RBAC system
    const writeRoles = [
      "ORGANIZATION_OWNER",
      "SUPER_ADMIN",
      "DEPARTMENT_MANAGER",
    ];

    return writeRoles.includes(role);
  }
}

/**
 * Audit logging utilities
 */
export class ShareAuditService {
  /**
   * Create an audit log entry for share access
   */
  static createLogEntry(
    shareId: string,
    action: TemplateShareAccessAction,
    status: TemplateShareAccessStatus,
    options: {
      recipientEmail?: string;
      userAgent?: string;
      ipAddress?: string;
      errorMessage?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ) {
    return {
      shareId,
      action,
      status,
      recipientEmail: options.recipientEmail ?? null,
      userAgent: options.userAgent ?? null,
      ipAddress: options.ipAddress ?? null,
      errorMessage: options.errorMessage ?? null,
      metadata: options.metadata
        ? (JSON.parse(
            JSON.stringify(options.metadata)
          ) as Prisma.InputJsonValue)
        : undefined,
    };
  }

  /**
   * Sanitize user agent string for logging
   */
  static sanitizeUserAgent(userAgent: string): string {
    // Remove potential sensitive information and limit length
    return userAgent.substring(0, 200).replace(/[<>'"]/g, "");
  }

  /**
   * Extract and sanitize IP address
   */
  static sanitizeIpAddress(ip: string): string {
    // Basic IP validation and sanitization
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^[0-9a-fA-F:]+$/;

    if (ipv4Regex.test(ip) || ipv6Regex.test(ip)) {
      return ip;
    }

    return "unknown";
  }
}

/**
 * Share URL utilities
 */
export class ShareUrlService {
  /**
   * Build share URLs for different contexts
   */
  static buildShareUrls(baseUrl: string, token: string) {
    const shareUrl = ShareTokenService.generateShareUrl(baseUrl, token);

    return {
      share: shareUrl,
      preview: shareUrl,
      import: `${shareUrl}/import`,
    };
  }

  /**
   * Build email invitation URLs
   */
  static buildEmailUrls(
    baseUrl: string,
    shareId: string,
    recipientEmail: string
  ) {
    const encodedEmail = encodeURIComponent(recipientEmail);

    return {
      preview: `${baseUrl}/shared/email/${shareId}?email=${encodedEmail}`,
      import: `${baseUrl}/shared/email/${shareId}/import?email=${encodedEmail}`,
      accept: `${baseUrl}/shared/email/${shareId}/accept?email=${encodedEmail}`,
    };
  }
}

/**
 * Email content utilities for invitations
 */
export class ShareEmailService {
  /**
   * Generate share URLs for email invitations
   */
  static buildEmailShareUrls(baseUrl: string, token: string) {
    // For dashboard folder, we need to update the URL structure
    const shareUrl = `${baseUrl}/shared/templates/${token}`;

    return {
      share: shareUrl,
      preview: shareUrl,
      import: `${shareUrl}?action=import`,
    };
  }

  /**
   * Validate email addresses
   */
  static validateEmailAddresses(emails: string[]): {
    valid: string[];
    invalid: string[];
  } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid: string[] = [];
    const invalid: string[] = [];

    emails.forEach(email => {
      const trimmed = email.trim();
      if (emailRegex.test(trimmed)) {
        valid.push(trimmed);
      } else {
        invalid.push(trimmed);
      }
    });

    return { valid, invalid };
  }

  /**
   * Create email invitation data
   */
  static createInvitationData(
    shareId: string,
    recipientEmails: string[],
    templateName: string,
    organizationName: string,
    shareUrl: string,
    senderName?: string,
    message?: string,
    expiresAt?: Date
  ) {
    return recipientEmails.map(email => ({
      shareId,
      recipientEmail: email,
      templateName,
      organizationName,
      shareUrl,
      senderName,
      message,
      expiresAt,
    }));
  }
}
