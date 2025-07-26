import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { contactsCrmRoutes } from "./routers/crm/contacts";
import { organizationRouter } from "./routers/organization";
import { interactionsRouter } from "./routers/crm/interactions";
import { dealsCrmRoutes } from "./routers/crm/deals";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  contactsCrm: contactsCrmRoutes,
  organization: organizationRouter,
  interactions: interactionsRouter,
  dealsCrm: dealsCrmRoutes,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
