import { createTRPCRouter } from "../../trpc";
import { workflowRouter } from "./workflow";
import { triggersRouter } from "./triggers";
import { actionsRouter } from "./actions";
import { actionSystemRouter } from "./action-system";
import { executionsRouter } from "./executions";
import { integrationsRouter } from "./integrations";
import { variablesRouter } from "./variables";
import { workflowAnalyticsRouter } from "./analytics";
import { nodesRouter } from "./components/nodes";
import { connectionsRouter } from "./connections";
import { prebuiltWorkflowsRouter } from "./prebuilt";

export const workflowsRouter = createTRPCRouter({
  workflow: workflowRouter,
  prebuilt: prebuiltWorkflowsRouter,
  triggers: triggersRouter,
  actions: actionsRouter,
  actionSystem: actionSystemRouter,
  executions: executionsRouter,
  integrations: integrationsRouter,
  variables: variablesRouter,
  analytics: workflowAnalyticsRouter,
  nodes: nodesRouter,
  connections: connectionsRouter,
});
