import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  createTRPCRouter,
  createPermissionProcedure,
  createAnyPermissionProcedure,
} from "../trpc";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS } from "~/lib/rbac";
import { TemplateManifestSchema } from "~/types/templates";
import {
  exportTemplateManifest,
  ExportSelectionSchema,
} from "~/lib/services/templates-exporter";
import {
  startInstall,
  StartInstallSchema,
} from "~/lib/services/templates-installer";

const toInputJson = <T>(v: T): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(v)) as unknown as Prisma.InputJsonValue;

export const templatesRouter = createTRPCRouter({
  listPublic: createAnyPermissionProcedure([PERMISSIONS.TEMPLATES_READ])
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const items = await ctx.db.templatePackage.findMany({
        where: { visibility: "PUBLIC", status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });
      return items;
    }),

  listOrg: createPermissionProcedure(PERMISSIONS.TEMPLATES_READ)
    .input(z.object({ organizationId: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
      return ctx.db.templatePackage.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: "desc" },
      });
    }),

  getDetails: createAnyPermissionProcedure([PERMISSIONS.TEMPLATES_READ])
    .input(z.object({ templatePackageId: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      const pkg = await ctx.db.templatePackage.findUnique({
        where: { id: input.templatePackageId },
        include: { versions: true },
      });
      if (!pkg) throw new TRPCError({ code: "NOT_FOUND" });
      return pkg;
    }),

  createPackage: createPermissionProcedure(PERMISSIONS.TEMPLATES_WRITE)
    .input(
      z.object({
        organizationId: z.string().cuid(),
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        version: z.string().regex(/^\d+\.\d+\.\d+$/),
        iconUrl: z.string().url().optional(),
        tags: z.array(z.string()).optional(),
        manifest: TemplateManifestSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
      const created = await ctx.db.templatePackage.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          description: input.description ?? null,
          category: input.category ?? null,
          version: input.version,
          visibility: "PRIVATE",
          status: "DRAFT",
          iconUrl: input.iconUrl ?? null,
          tags: input.tags ?? [],
          manifest: toInputJson(input.manifest),
          assetsCount:
            (input.manifest.assets.workflows?.length ?? 0) +
            (input.manifest.assets.actionTemplates?.length ?? 0) +
            (input.manifest.assets.reports?.length ?? 0),
          createdById: ctx.user.id,
        },
      });
      return created;
    }),

  createVersion: createPermissionProcedure(PERMISSIONS.TEMPLATES_WRITE)
    .input(
      z.object({
        organizationId: z.string().cuid(),
        templatePackageId: z.string().cuid(),
        version: z.string().regex(/^\d+\.\d+\.\d+$/),
        changelog: z.string().optional(),
        manifest: TemplateManifestSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
      const pkg = await ctx.db.templatePackage.findFirst({
        where: {
          id: input.templatePackageId,
          organizationId: input.organizationId,
        },
      });
      if (!pkg) throw new TRPCError({ code: "FORBIDDEN" });
      const created = await ctx.db.templateVersion.create({
        data: {
          templatePackageId: input.templatePackageId,
          version: input.version,
          manifest: toInputJson(input.manifest),
          changelog: input.changelog ?? null,
          isActive: false,
          createdById: ctx.user.id,
        },
      });
      return created;
    }),

  validateManifest: createAnyPermissionProcedure([PERMISSIONS.TEMPLATES_READ])
    .input(z.object({ manifest: TemplateManifestSchema }))
    .mutation(async ({ input }) => {
      const parse = TemplateManifestSchema.safeParse(input.manifest);
      if (!parse.success) {
        return { valid: false, issues: parse.error.issues };
      }
      return { valid: true, issues: [] };
    }),

  exportSelection: createPermissionProcedure(PERMISSIONS.TEMPLATES_WRITE)
    .input(ExportSelectionSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
      const manifest = await exportTemplateManifest(input);
      return manifest;
    }),

  startInstall: createPermissionProcedure(PERMISSIONS.TEMPLATES_WRITE)
    .input(StartInstallSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
      const res = await startInstall(input);
      return res;
    }),

  getInstallationStatus: createPermissionProcedure(PERMISSIONS.TEMPLATES_READ)
    .input(
      z.object({
        organizationId: z.string().cuid(),
        installationId: z.string().cuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
      const installation = await ctx.db.templateInstallation.findFirst({
        where: {
          id: input.installationId,
          organizationId: input.organizationId,
        },
        include: { items: true },
      });
      if (!installation) throw new TRPCError({ code: "NOT_FOUND" });
      return installation;
    }),

  listInstallations: createPermissionProcedure(PERMISSIONS.TEMPLATES_READ)
    .input(z.object({ organizationId: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
      return ctx.db.templateInstallation.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: "desc" },
      });
    }),

  publish: createPermissionProcedure(PERMISSIONS.TEMPLATES_PUBLISH)
    .input(
      z.object({
        organizationId: z.string().cuid(),
        templatePackageId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
      const pkg = await ctx.db.templatePackage.findFirst({
        where: {
          id: input.templatePackageId,
          organizationId: input.organizationId,
        },
      });
      if (!pkg) throw new TRPCError({ code: "FORBIDDEN" });
      return ctx.db.templatePackage.update({
        where: { id: input.templatePackageId },
        data: { status: "PUBLISHED", visibility: "PUBLIC" },
      });
    }),

  unpublish: createPermissionProcedure(PERMISSIONS.TEMPLATES_PUBLISH)
    .input(
      z.object({
        organizationId: z.string().cuid(),
        templatePackageId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
      const pkg = await ctx.db.templatePackage.findFirst({
        where: {
          id: input.templatePackageId,
          organizationId: input.organizationId,
        },
      });
      if (!pkg) throw new TRPCError({ code: "FORBIDDEN" });
      return ctx.db.templatePackage.update({
        where: { id: input.templatePackageId },
        data: { status: "DRAFT", visibility: "PRIVATE" },
      });
    }),
});
