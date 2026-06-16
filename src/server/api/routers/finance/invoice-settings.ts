import { z } from "zod";
import {
  createTRPCRouter,
  createPermissionProcedure,
  createAnyPermissionProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";
import { PERMISSIONS } from "~/lib/rbac";

// Per-organization invoicing configuration (defaults, branding, numbering,
// editable email templates). All values are overridable per invoice.
export const invoiceSettingsRouter = createTRPCRouter({
  get: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(z.object({ organizationId: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);
      // May be null — the UI falls back to sensible defaults.
      return db.invoiceSettings.findUnique({
        where: { organizationId: input.organizationId },
      });
    }),

  upsert: createPermissionProcedure(PERMISSIONS.FINANCE_ADMIN)
    .input(
      z.object({
        organizationId: z.string().cuid(),
        // Business identity
        businessName: z.string().nullish(),
        businessEmail: z.string().nullish(),
        businessPhone: z.string().nullish(),
        businessAddress: z.string().nullish(),
        businessWebsite: z.string().nullish(),
        logoUrl: z.string().nullish(),
        // Defaults (non-null columns use optional, not nullable)
        defaultCurrency: z.string().optional(),
        defaultLocale: z.string().optional(),
        defaultTaxEnabled: z.boolean().optional(),
        defaultTaxLabel: z.string().optional(),
        defaultTaxRate: z.number().min(0).max(100).optional(),
        taxRegistrationId: z.string().nullish(),
        defaultPaymentTerms: z.string().optional(),
        paymentInstructions: z.string().nullish(),
        defaultNotes: z.string().nullish(),
        defaultTermsAndConditions: z.string().nullish(),
        // Numbering
        invoicePrefix: z.string().optional(),
        invoiceNumberFormat: z.string().optional(),
        invoiceSequenceNext: z.number().int().min(1).optional(),
        invoiceSequencePadding: z.number().int().min(1).max(12).optional(),
        // Editable email templates
        emailInvoiceSubject: z.string().nullish(),
        emailInvoiceBody: z.string().nullish(),
        emailReminderSubject: z.string().nullish(),
        emailReminderBody: z.string().nullish(),
        emailReceiptSubject: z.string().nullish(),
        emailReceiptBody: z.string().nullish(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
      const { organizationId, ...data } = input;
      return db.invoiceSettings.upsert({
        where: { organizationId },
        create: { organizationId, ...data },
        update: data,
      });
    }),
});
