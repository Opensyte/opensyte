import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { Resend } from "resend";
import { env } from "~/env";
import { render } from "@react-email/components";
import { InviteEmail } from "~/server/email/templates/invite-email";
import { v4 as uuidv4 } from "uuid";
import { type InvitationStatus, UserRole } from "@prisma/client";
import { canAssignRole } from "~/lib/rbac";

function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    `http://localhost:${process.env.PORT ?? 3000}`
  );
}

async function requireOrgRole(
  userId: string,
  organizationId: string,
  roles: readonly UserRole[]
) {
  const rel = await db.userOrganization.findFirst({
    where: { userId, organizationId, role: { in: roles as UserRole[] } },
  });
  if (!rel) throw new Error("Insufficient permissions");
  return rel;
}

export const invitationsRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      // User must be in org to view invites
      const membership = await db.userOrganization.findFirst({
        where: { userId: ctx.user.id, organizationId: input.organizationId },
      });
      if (!membership) throw new Error("Access denied");

      const invites = (await db.invitation.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          expiresAt: true,
        },
      })) as Array<{
        id: string;
        email: string;
        role: UserRole;
        status: InvitationStatus;
        createdAt: Date;
        expiresAt: Date;
      }>;
      return invites.map(i => ({
        id: i.id,
        email: i.email,
        role: i.role,
        status: i.status,
        createdAt: i.createdAt.toISOString(),
        expiresAt: i.expiresAt.toISOString(),
      }));
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        email: z.string().email(),
        role: z.nativeEnum(UserRole).default(UserRole.VIEWER),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("Unauthorized");
      await requireOrgRole(userId, input.organizationId, [
        UserRole.ORGANIZATION_OWNER,
        UserRole.SUPER_ADMIN,
        UserRole.DEPARTMENT_MANAGER,
      ] as const);

      // Enforce role hierarchy: user cannot invite a role they cannot assign
      const inviterRel = await db.userOrganization.findFirst({
        where: { userId, organizationId: input.organizationId },
        select: { role: true },
      });
      if (!inviterRel) throw new Error("Access denied");
      if (!canAssignRole(inviterRel.role, input.role)) {
        throw new Error("Cannot invite user with higher or equal role");
      }

      const organization = await db.organization.findUnique({
        where: { id: input.organizationId },
        select: { name: true },
      });

      // Ensure not already a member
      const existingMember = await db.user.findFirst({
        where: { email: input.email },
      });
      if (existingMember) {
        const already = await db.userOrganization.findFirst({
          where: {
            userId: existingMember.id,
            organizationId: input.organizationId,
          },
        });
        if (already)
          throw new Error("User is already a member of this organization");
      }

      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

      // Upsert by unique (organizationId, email)
      const invite = await db.invitation.upsert({
        where: {
          organizationId_email: {
            organizationId: input.organizationId,
            email: input.email,
          },
        },
        create: {
          organizationId: input.organizationId,
          email: input.email,
          role: input.role,
          inviterId: userId,
          token,
          status: "PENDING",
          expiresAt,
        },
        update: {
          role: input.role,
          inviterId: userId,
          token,
          status: "PENDING",
          expiresAt,
        },
        select: {
          id: true,
          email: true,
          role: true,
          token: true,
          expiresAt: true,
        },
      });

      const acceptUrl = `${getBaseUrl()}/accept-invite?token=${invite.token}`;
      const html = await render(
        InviteEmail({
          organizationName: organization?.name ?? "Organization",
          inviteeEmail: invite.email,
          inviterName: ctx.user?.name ?? null,
          role: invite.role,
          acceptUrl,
          expiresAt: invite.expiresAt.toISOString().split("T")[0] ?? "",
        })
      );

      const resend = new Resend(env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Acme <onboarding@resend.dev>",
        to: invite.email,
        subject: `You're invited to ${organization?.name ?? "an organization"}`,
        html,
      });

      return { id: invite.id };
    }),

  resend: publicProcedure
    .input(z.object({ id: z.string(), organizationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("Unauthorized");
      await requireOrgRole(userId, input.organizationId, [
        UserRole.ORGANIZATION_OWNER,
        UserRole.SUPER_ADMIN,
        UserRole.DEPARTMENT_MANAGER,
      ] as const);

      const invite = await db.invitation.findFirst({
        where: { id: input.id, organizationId: input.organizationId },
        select: { id: true, email: true, role: true, status: true },
      });
      if (!invite) throw new Error("Invitation not found");
      if (invite.status !== "PENDING")
        throw new Error("Cannot resend non-pending invitation");

      const organization = await db.organization.findUnique({
        where: { id: input.organizationId },
        select: { name: true },
      });

      const newToken = uuidv4();
      const updated = await db.invitation.update({
        where: { id: invite.id },
        data: {
          token: newToken,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        },
        select: {
          id: true,
          email: true,
          role: true,
          token: true,
          expiresAt: true,
        },
      });

      const acceptUrl = `${getBaseUrl()}/accept-invite?token=${updated.token}`;
      const html = await render(
        InviteEmail({
          organizationName: organization?.name ?? "Organization",
          inviteeEmail: updated.email,
          inviterName: ctx.user?.name ?? null,
          role: updated.role,
          acceptUrl,
          expiresAt: updated.expiresAt.toISOString().split("T")[0] ?? "",
        })
      );

      const resend = new Resend(env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Opensyte <onboarding@resend.dev>",
        to: updated.email,
        subject: `You're invited to ${organization?.name ?? "an organization"}`,
        html,
      });
      return { success: true };
    }),

  revoke: publicProcedure
    .input(z.object({ id: z.string(), organizationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("Unauthorized");
      await requireOrgRole(userId, input.organizationId, [
        UserRole.ORGANIZATION_OWNER,
        UserRole.SUPER_ADMIN,
        UserRole.DEPARTMENT_MANAGER,
      ] as const);
      await db.invitation.update({
        where: { id: input.id },
        data: { status: "REVOKED" },
      });
      return { success: true };
    }),

  acceptByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id || !ctx.user.email) throw new Error("Unauthorized");
      const invite = await db.invitation.findFirst({
        where: { token: input.token },
        select: {
          id: true,
          email: true,
          organizationId: true,
          role: true,
          status: true,
          expiresAt: true,
        },
      });
      if (!invite) throw new Error("Invalid invitation token");
      if (invite.status !== "PENDING")
        throw new Error("Invitation is not pending");
      if (invite.expiresAt.getTime() < Date.now()) {
        await db.invitation.update({
          where: { id: invite.id },
          data: { status: "EXPIRED" },
        });
        throw new Error("Invitation expired");
      }
      if (invite.email.toLowerCase() !== ctx.user.email.toLowerCase()) {
        throw new Error("This invitation was sent to a different email");
      }

      // Add membership
      await db.userOrganization.upsert({
        where: {
          userId_organizationId: {
            userId: ctx.user.id,
            organizationId: invite.organizationId,
          },
        },
        create: {
          userId: ctx.user.id,
          organizationId: invite.organizationId,
          role: invite.role,
        },
        update: {},
      });

      await db.invitation.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      });
      return { success: true, organizationId: invite.organizationId };
    }),
});
