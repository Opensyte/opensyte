/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "~/lib/auth";
import { db } from "~/server/db";
import {
  hasAnyPermission as hasAnyCustomPermission,
  hasPermission as hasCustomPermission,
} from "~/lib/custom-rbac";
import type { ExtendedUserOrganization } from "~/types/custom-roles";
import {
  checkUserEarlyAccess,
  isEarlyAccessEnabled,
  isAdminEmail,
} from "~/lib/early-access";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const authSession = await auth.api.getSession({
    headers: opts.headers,
  });

  // Check early access requirements
  let hasEarlyAccess = true; // Default to true if early access is disabled

  if (isEarlyAccessEnabled() && authSession?.user) {
    const accessStatus = await checkUserEarlyAccess();

    // Check if user is an admin (admins get automatic access to bypass early access)
    // Users listed in ADMIN_EMAILS environment variable can access the dashboard
    // without needing to register an early access code
    const userIsAdmin = authSession.user.email
      ? isAdminEmail(authSession.user.email)
      : false;

    // User has access if they have early access OR are an admin
    hasEarlyAccess = accessStatus.hasAccess || userIsAdmin;
  }

  return {
    db,
    user: authSession?.user,
    hasEarlyAccess,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path, ctx }) => {
  if (!ctx.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }

  const result = await next({
    ctx: {
      user: ctx.user,
    },
  });

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Early access middleware
 *
 * Ensures users have early access before accessing protected procedures
 */
const earlyAccessMiddleware = t.middleware(async ({ next, ctx }) => {
  if (!ctx.user?.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  if (!ctx.hasEarlyAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Early access required. Please enter your registration code to continue.",
    });
  }

  return next({
    ctx: {
      user: ctx.user,
      hasEarlyAccess: ctx.hasEarlyAccess,
    },
  });
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected procedure with early access check
 *
 * This procedure ensures the user is authenticated and has early access (or is an admin)
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(earlyAccessMiddleware);

/**
 * Permission-based procedure middleware
 *
 * Creates procedures that require specific permissions and early access
 */
export const createPermissionProcedure = (permission: string) => {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to access this resource",
      });
    }

    return next({
      ctx: {
        ...ctx,
        requirePermission: async (organizationId: string) => {
          const userOrg = await ctx.db.userOrganization.findFirst({
            where: {
              userId: ctx.user.id,
              organizationId,
            },
            include: {
              customRole: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          });

          if (!userOrg) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "User not found in organization",
            });
          }

          // Use the custom RBAC function that handles both predefined and custom roles
          if (
            !hasCustomPermission(
              userOrg as ExtendedUserOrganization,
              permission
            )
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Access denied. Required permission: ${permission}`,
            });
          }

          return userOrg.role;
        },
      },
    });
  });
};

/**
 * Multiple permission-based procedure middleware
 *
 * Creates procedures that require any of the specified permissions and early access
 */
export const createAnyPermissionProcedure = (permissions: string[]) => {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to access this resource",
      });
    }

    return next({
      ctx: {
        ...ctx,
        requireAnyPermission: async (organizationId: string) => {
          const userOrg = await ctx.db.userOrganization.findFirst({
            where: {
              userId: ctx.user.id,
              organizationId,
            },
            include: {
              customRole: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          });

          if (!userOrg) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "User not found in organization",
            });
          }

          // Use the custom RBAC function that handles both predefined and custom roles
          if (
            !hasAnyCustomPermission(
              userOrg as ExtendedUserOrganization,
              permissions
            )
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Access denied. Required permissions: ${permissions.join(" OR ")}`,
            });
          }

          return userOrg.role;
        },
      },
    });
  });
};
