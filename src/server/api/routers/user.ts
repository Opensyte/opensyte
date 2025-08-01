import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  // Get user by ID
  getById: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.user.findUnique({
        where: {
          id: input.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });
    }),

  // Get organization members (users in an organization)
  getOrganizationMembers: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const orgMembers = await ctx.db.userOrganization.findMany({
        where: {
          organizationId: input.organizationId,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Get user details for each member
      const userIds = orgMembers.map(member => member.userId);
      const users = await ctx.db.user.findMany({
        where: {
          id: {
            in: userIds,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });

      // Combine member info with user details
      return orgMembers.map(member => {
        const user = users.find(u => u.id === member.userId);
        return {
          ...member,
          user,
        };
      });
    }),
});
