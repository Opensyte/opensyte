import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Prisma,
  PrismaClient,
  Workflow,
  WorkflowConnection,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowStatus,
} from "@prisma/client";
import type { workflowRouter as WorkflowRouterValue } from "../workflow";
import type { nodesRouter as NodesRouterValue } from "../components/nodes";
const USER_ID = "user_test";
const ORG_ID = "cjld2cjxh0000qzrmn831i7rn"; // valid cuid for schema checks

const baseTimestamp = new Date("2024-01-01T00:00:00.000Z");

const baseUser = {
  id: USER_ID,
  name: "Test Owner",
  email: "owner@opensyte.test",
  emailVerified: true,
  createdAt: baseTimestamp,
  updatedAt: new Date("2024-01-02T00:00:00.000Z"),
  image: null as string | null,
};

type UserOrganizationWithPermissions = Prisma.UserOrganizationGetPayload<{
  include: {
    customRole: {
      include: {
        permissions: {
          include: {
            permission: true;
          };
        };
      };
    };
  };
}>;

interface MockState {
  workflows: Map<string, Workflow>;
  workflowNodes: Map<string, WorkflowNode>;
  workflowConnections: Map<string, WorkflowConnection>;
  userOrganizations: Map<string, UserOrganizationWithPermissions>;
}

interface MockDb {
  workflow: {
    findFirst: (args: Prisma.WorkflowFindFirstArgs) => Promise<Workflow | null>;
    create: <T extends Prisma.WorkflowCreateArgs>(
      args: T
    ) => Promise<Prisma.WorkflowGetPayload<T>>;
  };
  workflowNode: {
    findMany: <T extends Prisma.WorkflowNodeFindManyArgs>(
      args: T
    ) => Promise<Array<Prisma.WorkflowNodeGetPayload<T>>>;
    upsert: <T extends Prisma.WorkflowNodeUpsertArgs>(
      args: T
    ) => Promise<Prisma.WorkflowNodeGetPayload<T>>;
  };
  workflowConnection: {
    deleteMany: (
      args: Prisma.WorkflowConnectionDeleteManyArgs
    ) => Promise<Prisma.BatchPayload>;
    create: <T extends Prisma.WorkflowConnectionCreateArgs>(
      args: T
    ) => Promise<Prisma.WorkflowConnectionGetPayload<T>>;
  };
  userOrganization: {
    findFirst: (
      args: Prisma.UserOrganizationFindFirstArgs
    ) => Promise<UserOrganizationWithPermissions | null>;
  };
  $transaction: <T>(callback: (tx: MockDb) => Promise<T>) => Promise<T>;
  __internal: MockState;
}

let cuidCounter = 0;

const nextCuid = () => `c${(++cuidCounter).toString(36).padStart(24, "0")}`;

const normalizeDate = (
  value: Date | string | null | undefined
): Date | null => {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
};

const createWorkflowRecord = (
  input: Prisma.WorkflowUncheckedCreateInput
): Workflow => {
  const now = new Date();
  const status: WorkflowStatus = input.status ?? "INACTIVE";
  const workflowId = input.id ?? nextCuid();

  return {
    id: workflowId,
    organizationId: input.organizationId,
    name: input.name,
    description: input.description ?? null,
    version: input.version ?? 1,
    status,
    isTemplate: input.isTemplate ?? false,
    category: input.category ?? null,
    canvasData: (input.canvasData as Prisma.JsonValue) ?? null,
    retryConfig: (input.retryConfig as Prisma.JsonValue) ?? null,
    timeoutConfig: (input.timeoutConfig as Prisma.JsonValue) ?? null,
    totalExecutions: input.totalExecutions ?? 0,
    successfulExecutions: input.successfulExecutions ?? 0,
    failedExecutions: input.failedExecutions ?? 0,
    lastExecutedAt: normalizeDate(input.lastExecutedAt as Date | string | null),
    createdById: input.createdById ?? USER_ID,
    updatedById: input.updatedById ?? null,
    publishedAt: normalizeDate(input.publishedAt as Date | string | null),
    publishedById: input.publishedById ?? null,
    archivedAt: normalizeDate(input.archivedAt as Date | string | null),
    createdAt: now,
    updatedAt: now,
  } satisfies Workflow;
};

const createWorkflowNodeRecord = (
  workflowId: string,
  nodeId: string,
  data: {
    type: WorkflowNodeType;
    name: string;
    description?: string | null;
    position: Prisma.JsonValue;
    config?: Prisma.JsonValue | null;
    template?: Prisma.JsonValue | null;
    executionOrder?: number | null;
    isOptional?: boolean;
    retryLimit?: number | null;
    timeout?: number | null;
    conditions?: Prisma.JsonValue | null;
  }
): WorkflowNode => {
  const now = new Date();
  return {
    id: nextCuid(),
    workflowId,
    nodeId,
    type: data.type,
    name: data.name,
    description: data.description ?? null,
    position: data.position,
    config: data.config ?? null,
    template: data.template ?? null,
    executionOrder: data.executionOrder ?? null,
    isOptional: data.isOptional ?? false,
    retryLimit: data.retryLimit ?? 3,
    timeout: data.timeout ?? null,
    conditions: data.conditions ?? null,
    createdAt: now,
    updatedAt: now,
  } satisfies WorkflowNode;
};

const updateWorkflowNodeRecord = (
  existing: WorkflowNode,
  updates: {
    type?: WorkflowNodeType;
    name?: string;
    description?: string | null;
    position?: Prisma.JsonValue;
    config?: Prisma.JsonValue | null;
    template?: Prisma.JsonValue | null;
    executionOrder?: number | null;
    isOptional?: boolean;
    retryLimit?: number | null;
    timeout?: number | null;
    conditions?: Prisma.JsonValue | null;
  }
): WorkflowNode => ({
  ...existing,
  type: updates.type ?? existing.type,
  name: updates.name ?? existing.name,
  description: updates.description ?? existing.description,
  position: updates.position ?? existing.position,
  config: updates.config ?? existing.config,
  template: updates.template ?? existing.template,
  executionOrder: updates.executionOrder ?? existing.executionOrder,
  isOptional: updates.isOptional ?? existing.isOptional,
  retryLimit: updates.retryLimit ?? existing.retryLimit,
  timeout: updates.timeout ?? existing.timeout,
  conditions: updates.conditions ?? existing.conditions,
  updatedAt: new Date(),
});

const createMockDb = (): MockDb => {
  const state: MockState = {
    workflows: new Map(),
    workflowNodes: new Map(),
    workflowConnections: new Map(),
    userOrganizations: new Map(),
  };

  const userOrg: UserOrganizationWithPermissions = {
    userId: USER_ID,
    organizationId: ORG_ID,
    role: "ORGANIZATION_OWNER",
    customRoleId: null,
    joinedAt: baseTimestamp,
    customRole: null,
  };

  state.userOrganizations.set(`${USER_ID}:${ORG_ID}`, userOrg);

  const workflowDelegate: MockDb["workflow"] = {
    findFirst: async args => {
      const where = args.where ?? {};
      for (const workflow of state.workflows.values()) {
        const matchesId =
          typeof where?.id === "string" ? workflow.id === where.id : true;
        const matchesOrganization =
          typeof where?.organizationId === "string"
            ? workflow.organizationId === where.organizationId
            : true;
        const matchesName =
          typeof where?.name === "string" ? workflow.name === where.name : true;

        if (matchesId && matchesOrganization && matchesName) {
          return { ...workflow };
        }
      }
      return null;
    },
    create: async args => {
      const data = args.data as Prisma.WorkflowUncheckedCreateInput;
      const workflow = createWorkflowRecord(data);
      state.workflows.set(workflow.id, workflow);

      const include = args.include ?? {};
      const payload: Workflow & {
        triggers?: [];
        nodes?: [];
        connections?: [];
      } = { ...workflow };

      if (include.triggers) {
        payload.triggers = [];
      }
      if (include.nodes) {
        payload.nodes = [];
      }
      if (include.connections) {
        payload.connections = [];
      }

      return payload as Prisma.WorkflowGetPayload<typeof args>;
    },
  };

  const workflowNodeDelegate: MockDb["workflowNode"] = {
    findMany: async args => {
      const where = args.where ?? {};
      const workflowId =
        typeof where?.workflowId === "string" ? where.workflowId : undefined;

      const nodes = Array.from(state.workflowNodes.values()).filter(node => {
        if (workflowId && node.workflowId !== workflowId) {
          return false;
        }
        return true;
      });

      if (args.select) {
        return nodes.map(node => {
          const selected: Record<string, unknown> = {};
          for (const key of Object.keys(args.select ?? {})) {
            if ((args.select as Record<string, boolean>)[key]) {
              selected[key] = (node as Record<string, unknown>)[key];
            }
          }
          return selected as Prisma.WorkflowNodeGetPayload<typeof args>;
        });
      }

      return nodes.map(node => ({ ...node })) as Array<
        Prisma.WorkflowNodeGetPayload<typeof args>
      >;
    },
    upsert: async args => {
      const whereComposite = args.where?.workflowId_nodeId;
      if (!whereComposite) {
        throw new Error("workflowId_nodeId selector is required for upsert");
      }

      const compositeKey = `${whereComposite.workflowId}:${whereComposite.nodeId}`;
      const existing = state.workflowNodes.get(compositeKey);

      if (existing) {
        const updated = updateWorkflowNodeRecord(existing, {
          type: args.update.type as WorkflowNodeType | undefined,
          name: args.update.name as string | undefined,
          description: args.update.description as string | null | undefined,
          position: args.update.position as Prisma.JsonValue | undefined,
          config: args.update.config as Prisma.JsonValue | null | undefined,
          template: args.update.template as Prisma.JsonValue | null | undefined,
          executionOrder: args.update.executionOrder as
            | number
            | null
            | undefined,
          isOptional: args.update.isOptional as boolean | undefined,
          retryLimit: args.update.retryLimit as number | null | undefined,
          timeout: args.update.timeout as number | null | undefined,
          conditions: args.update.conditions as
            | Prisma.JsonValue
            | null
            | undefined,
        });
        state.workflowNodes.set(compositeKey, updated);
        return { ...updated } as Prisma.WorkflowNodeGetPayload<typeof args>;
      }

      const created = createWorkflowNodeRecord(
        whereComposite.workflowId,
        whereComposite.nodeId,
        {
          type: args.create.type,
          name: args.create.name,
          description: args.create.description,
          position: args.create.position as Prisma.JsonValue,
          config: args.create.config as Prisma.JsonValue | null | undefined,
          template: args.create.template as Prisma.JsonValue | null | undefined,
          executionOrder: args.create.executionOrder,
          isOptional: args.create.isOptional ?? undefined,
          retryLimit: args.create.retryLimit,
          timeout: args.create.timeout,
          conditions: args.create.conditions as
            | Prisma.JsonValue
            | null
            | undefined,
        }
      );

      state.workflowNodes.set(compositeKey, created);
      return { ...created } as Prisma.WorkflowNodeGetPayload<typeof args>;
    },
  };

  const workflowConnectionDelegate: MockDb["workflowConnection"] = {
    deleteMany: async () => {
      const count = state.workflowConnections.size;
      state.workflowConnections.clear();
      return { count };
    },
    create: async args => {
      const data = args.data as Prisma.WorkflowConnectionUncheckedCreateInput;
      const connection: WorkflowConnection = {
        id: data.id ?? nextCuid(),
        workflowId: data.workflowId,
        sourceNodeId: data.sourceNodeId,
        targetNodeId: data.targetNodeId,
        executionOrder: data.executionOrder ?? 1,
        label: data.label ?? null,
        conditions: (data.conditions as Prisma.JsonValue) ?? null,
        edgeId: data.edgeId ?? null,
        sourceHandle: data.sourceHandle ?? null,
        targetHandle: data.targetHandle ?? null,
        style: (data.style as Prisma.JsonValue) ?? null,
        animated: data.animated ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      state.workflowConnections.set(connection.id, connection);
      return { ...connection } as Prisma.WorkflowConnectionGetPayload<
        typeof args
      >;
    },
  };

  const userOrganizationDelegate: MockDb["userOrganization"] = {
    findFirst: async args => {
      const where = args.where ?? {};
      const userId = where.userId;
      const organizationId = where.organizationId;
      if (typeof userId !== "string" || typeof organizationId !== "string") {
        return null;
      }
      const record = state.userOrganizations.get(`${userId}:${organizationId}`);
      if (!record) {
        return null;
      }
      return { ...record };
    },
  };

  const db: MockDb = {
    workflow: workflowDelegate,
    workflowNode: workflowNodeDelegate,
    workflowConnection: workflowConnectionDelegate,
    userOrganization: userOrganizationDelegate,
    $transaction: async callback => callback(db),
    __internal: state,
  };

  return db;
};

const mockDbState: { current: MockDb } = {
  current: createMockDb(),
};

vi.mock("~/server/db", () => ({
  get db() {
    return mockDbState.current as unknown as PrismaClient;
  },
}));

vi.mock("~/lib/custom-rbac", () => ({
  hasPermission: vi.fn(() => true),
  hasAnyPermission: vi.fn(() => true),
}));

vi.mock("~/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(async () => ({ user: baseUser })),
    },
  },
}));

vi.mock("~/lib/early-access", () => ({
  checkUserEarlyAccess: vi.fn(async () => ({
    hasAccess: true,
    reason: "test",
  })),
  isEarlyAccessEnabled: vi.fn(() => false),
  isAdminEmail: vi.fn(() => false),
}));

vi.mock("parse5", () => ({
  parse: vi.fn(() => ({})),
  serialize: vi.fn(() => ""),
}));

const createContext = () => ({
  db: mockDbState.current as unknown as PrismaClient,
  user: baseUser,
  hasEarlyAccess: true,
  headers: new Headers(),
});

type WorkflowRouterType = typeof WorkflowRouterValue;
type NodesRouterType = typeof NodesRouterValue;

let workflowRouter: WorkflowRouterType;
let nodesRouter: NodesRouterType;

describe("Workflow designer integration", () => {
  beforeAll(async () => {
    ({ workflowRouter } = await import("../workflow"));
    ({ nodesRouter } = await import("../components/nodes"));
  });

  beforeEach(() => {
    cuidCounter = 0;
    mockDbState.current = createMockDb();
  });

  it("persists schedule nodes with sanitized configuration", async () => {
    const context = createContext();
    const workflowCaller = workflowRouter.createCaller(context);
    const nodesCaller = nodesRouter.createCaller(context);

    const workflow = await workflowCaller.createWorkflow({
      organizationId: ORG_ID,
      name: "Automated follow-up",
      description: "Workflow created from UI",
    });

    const nodes = await nodesCaller.syncNodes({
      organizationId: ORG_ID,
      workflowId: workflow.id,
      nodes: [
        {
          nodeId: "trigger-1",
          type: "TRIGGER",
          name: "Workflow Trigger",
          description: "Starts the workflow",
          position: { x: 80, y: 120 },
          config: {
            module: "crm",
            triggerType: "CONTACT_CREATED",
          },
          template: {},
          executionOrder: 1,
          isOptional: false,
          retryLimit: 3,
        },
        {
          nodeId: "action-schedule-1",
          type: "SCHEDULE",
          name: "Schedule Outreach",
          description: "Send recurring reminders",
          position: { x: 320, y: 120 },
          config: {
            cron: " 0 12 * * * ",
            timezone: " Europe/Paris ",
            startAt: " 2025-01-01T08:00:00.000Z ",
            metadata: {
              source: "designer",
            },
          },
          template: {},
          executionOrder: 2,
          isOptional: false,
          retryLimit: 3,
        },
      ],
    });

    expect(nodes).toHaveLength(2);

    const storedNodeKey = `${workflow.id}:action-schedule-1`;
    const storedNode =
      mockDbState.current.__internal.workflowNodes.get(storedNodeKey);
    expect(storedNode).toBeDefined();

    const storedConfig = storedNode?.config as Prisma.JsonObject | undefined;

    expect(storedConfig).toMatchObject({
      cron: "0 12 * * *",
      timezone: "Europe/Paris",
      startAt: "2025-01-01T08:00:00.000Z",
      metadata: { source: "designer" },
    });

    const fetchedNodes = await nodesCaller.getNodes({
      organizationId: ORG_ID,
      workflowId: workflow.id,
    });

    const scheduleNode = fetchedNodes.find(
      node => node.nodeId === "action-schedule-1"
    );

    expect(scheduleNode).toBeDefined();
    expect(scheduleNode?.config).toMatchObject({
      cron: "0 12 * * *",
      timezone: "Europe/Paris",
      startAt: "2025-01-01T08:00:00.000Z",
    });
  });

  it("rejects schedule nodes without required configuration", async () => {
    const context = createContext();
    const workflowCaller = workflowRouter.createCaller(context);
    const nodesCaller = nodesRouter.createCaller(context);

    const workflow = await workflowCaller.createWorkflow({
      organizationId: ORG_ID,
      name: "Missing schedule config",
    });

    await expect(
      nodesCaller.syncNodes({
        organizationId: ORG_ID,
        workflowId: workflow.id,
        nodes: [
          {
            nodeId: "action-schedule-1",
            type: "SCHEDULE",
            name: "Schedule without config",
            position: { x: 160, y: 160 },
            config: {},
          },
        ],
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("syncs advanced node types with sanitized configuration", async () => {
    const context = createContext();
    const workflowCaller = workflowRouter.createCaller(context);
    const nodesCaller = nodesRouter.createCaller(context);

    const workflow = await workflowCaller.createWorkflow({
      organizationId: ORG_ID,
      name: "Advanced node workflow",
    });

    await nodesCaller.syncNodes({
      organizationId: ORG_ID,
      workflowId: workflow.id,
      nodes: [
        {
          nodeId: "trigger-advanced",
          type: "TRIGGER",
          name: "Workflow Trigger",
          position: { x: 0, y: 0 },
          config: {
            module: "crm",
            triggerType: "CONTACT_CREATED",
          },
        },
        {
          nodeId: "delay-node",
          type: "DELAY",
          name: "Delay",
          position: { x: 200, y: 0 },
          config: {
            delayMs: 1500,
            resultKey: " delay_result ",
          },
        },
        {
          nodeId: "loop-node",
          type: "LOOP",
          name: "Loop over contacts",
          position: { x: 400, y: 0 },
          config: {
            sourceKey: "  contacts ",
            itemVariable: " person ",
            indexVariable: " idx ",
            maxIterations: 5,
            resultKey: " loop_output ",
            emptyPathHandle: " empty ",
          },
        },
        {
          nodeId: "query-node",
          type: "QUERY",
          name: "Find contacts",
          position: { x: 600, y: 0 },
          config: {
            model: " customer ",
            filters: [
              { field: " status ", operator: "equals", value: " Active " },
            ],
            limit: 25,
            resultKey: " query_results ",
          },
        },
        {
          nodeId: "filter-node",
          type: "FILTER",
          name: "Filter active",
          position: { x: 800, y: 0 },
          config: {
            sourceKey: " query_results ",
            conditions: [
              { field: "status", operator: "equals", value: "Active" },
            ],
            logicalOperator: "OR",
            resultKey: " filtered_results ",
          },
        },
        {
          nodeId: "schedule-node",
          type: "SCHEDULE",
          name: "Recurring run",
          position: { x: 1000, y: 0 },
          config: {
            cron: " 0 8 * * 1 ",
            timezone: " America/New_York ",
            metadata: {
              module: "crm",
            },
            resultKey: " schedule_metadata ",
          },
        },
      ],
    });

    const nodes = await nodesCaller.getNodes({
      organizationId: ORG_ID,
      workflowId: workflow.id,
    });

    const delayNode = nodes.find(node => node.nodeId === "delay-node");
    expect(delayNode?.config).toMatchObject({
      delayMs: 1500,
      resultKey: "delay_result",
    });

    const loopNode = nodes.find(node => node.nodeId === "loop-node");
    expect(loopNode?.config).toMatchObject({
      sourceKey: "contacts",
      itemVariable: "person",
      indexVariable: "idx",
      maxIterations: 5,
      resultKey: "loop_output",
      emptyPathHandle: "empty",
    });

    const queryNode = nodes.find(node => node.nodeId === "query-node");
    expect(queryNode?.config).toMatchObject({
      model: "customer",
      filters: [
        {
          field: "status",
          operator: "equals",
          value: "Active",
        },
      ],
      limit: 25,
      resultKey: "query_results",
    });

    const filterNode = nodes.find(node => node.nodeId === "filter-node");
    expect(filterNode?.config).toMatchObject({
      sourceKey: "query_results",
      logicalOperator: "OR",
      resultKey: "filtered_results",
    });

    const scheduleNode = nodes.find(node => node.nodeId === "schedule-node");
    expect(scheduleNode?.config).toMatchObject({
      cron: "0 8 * * 1",
      timezone: "America/New_York",
      resultKey: "schedule_metadata",
      metadata: { module: "crm" },
    });
  });
});
