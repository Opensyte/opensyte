import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { contactsCrmRoutes } from "./routers/crm/contacts";
import { organizationRouter } from "./routers/organization";
import { interactionsRouter } from "./routers/crm/interactions";
import { dealsCrmRoutes } from "./routers/crm/deals";
import { projectRouter } from "./routers/projects/project";
import { taskRouter } from "./routers/projects/task";
import { hrRouter } from "./routers/hr/hr";
import { invoiceRouter } from "./routers/finance/invoice";
import { expenseRouter } from "./routers/finance/expense";
import { expenseCategoriesRouter } from "./routers/finance/expense-categories";
import { financialReportsRouter } from "./routers/finance/financial-reports";
import { invitationsRouter } from "./routers/invitations";
import { rbacRouter } from "./routers/rbac";
import { customRolesRouter } from "./routers/custom-roles";
import { workflowsRouter } from "./routers/workflows";
import { templatesRouter } from "./routers/templates";
import { templateSharingRouter } from "./routers/template-sharing";
import { adminRouter } from "./routers/admin";
import { earlyAccessRouter } from "./routers/early-access";
import { paymentRouter } from "./routers/payment";

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
  project: projectRouter,
  task: taskRouter,
  hr: hrRouter,
  invoice: invoiceRouter,
  expense: expenseRouter,
  expenseCategories: expenseCategoriesRouter,
  financialReports: financialReportsRouter,
  invitations: invitationsRouter,
  rbac: rbacRouter,
  customRoles: customRolesRouter,
  workflows: workflowsRouter,
  templates: templatesRouter,
  templateSharing: templateSharingRouter,
  admin: adminRouter,
  earlyAccess: earlyAccessRouter,
  payment: paymentRouter,
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
