import { z } from "zod";
import {
  createTRPCRouter,
  createPermissionProcedure,
  createAnyPermissionProcedure,
} from "../../trpc";
import { PERMISSIONS } from "~/lib/rbac";
import { db } from "~/server/db";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import {
  WorkflowStatusSchema,
  WorkflowNodeTypeSchema,
} from "../../../../../prisma/generated/zod";
import {
  parseConfigForType,
  requiresConfigTypes,
} from "./components/node-config-schemas";

// Simplified workflow router that matches actual Prisma schema
export const workflowRouter = createTRPCRouter({
  // Get workflows
  getWorkflows: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string().cuid(),
        status: WorkflowStatusSchema.optional(),
        category: z.string().optional(),
        isTemplate: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      try {
        const where: Prisma.WorkflowWhereInput = {
          organizationId: input.organizationId,
          ...(input.status && { status: input.status }),
          ...(input.category && { category: input.category }),
          ...(input.isTemplate !== undefined && {
            isTemplate: input.isTemplate,
          }),
        };

        const [workflows, total] = await Promise.all([
          db.workflow.findMany({
            where,
            select: {
              id: true,
              name: true,
              description: true,
              version: true,
              status: true,
              isTemplate: true,
              category: true,
              totalExecutions: true,
              successfulExecutions: true,
              failedExecutions: true,
              lastExecutedAt: true,
              createdAt: true,
              updatedAt: true,
              publishedAt: true,
            },
            orderBy: { updatedAt: "desc" },
            skip: input.offset,
            take: input.limit,
          }),
          db.workflow.count({ where }),
        ]);

        return {
          workflows,
          total,
          hasMore: input.offset + workflows.length < total,
        };
      } catch (error) {
        console.error("Failed to fetch workflows:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch workflows",
        });
      }
    }),

  // Get workflow by ID
  getWorkflow: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      try {
        const workflow = await db.workflow.findFirst({
          where: {
            id: input.id,
            organizationId: input.organizationId,
          },
          include: {
            triggers: {
              where: { isActive: true },
              orderBy: { createdAt: "asc" },
            },
            nodes: {
              orderBy: [{ executionOrder: "asc" }, { createdAt: "asc" }],
            },
            connections: {
              orderBy: { createdAt: "asc" },
            },
          },
        });

        if (!workflow) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow not found",
          });
        }

        return workflow;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch workflow:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch workflow",
        });
      }
    }),

  // Create workflow
  createWorkflow: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        organizationId: z.string().cuid(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        category: z.string().optional(),
        isTemplate: z.boolean().default(false),
        canvasData: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Check if workflow name already exists
        const existingWorkflow = await db.workflow.findFirst({
          where: {
            organizationId: input.organizationId,
            name: input.name,
          },
        });

        if (existingWorkflow) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A workflow with this name already exists",
          });
        }

        const workflow = await db.workflow.create({
          data: {
            organizationId: input.organizationId,
            name: input.name,
            description: input.description,
            category: input.category,
            isTemplate: input.isTemplate,
            canvasData: input.canvasData as Prisma.InputJsonValue,
            status: "DRAFT",
            createdById: ctx.user.id,
          },
          include: {
            triggers: true,
            nodes: true,
            connections: true,
          },
        });

        return workflow;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to create workflow:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create workflow",
        });
      }
    }),

  // Update workflow
  updateWorkflow: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        canvasData: z.record(z.unknown()).optional(),
        status: z
          .enum(["DRAFT", "INACTIVE", "ACTIVE", "PAUSED", "ARCHIVED", "ERROR"])
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const { id, organizationId, ...updateData } = input;

      try {
        // Verify workflow exists and belongs to organization
        const existingWorkflow = await db.workflow.findFirst({
          where: {
            id,
            organizationId,
          },
        });

        if (!existingWorkflow) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow not found",
          });
        }

        // Check name uniqueness if name is being updated
        if (updateData.name && updateData.name !== existingWorkflow.name) {
          const nameConflict = await db.workflow.findFirst({
            where: {
              organizationId,
              name: updateData.name,
              id: { not: id },
            },
          });

          if (nameConflict) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "A workflow with this name already exists",
            });
          }
        }

        const updatedWorkflow = await db.workflow.update({
          where: { id },
          data: {
            ...(updateData.name && { name: updateData.name }),
            ...(updateData.description !== undefined && {
              description: updateData.description,
            }),
            ...(updateData.category && { category: updateData.category }),
            ...(updateData.canvasData && {
              canvasData: updateData.canvasData as Prisma.InputJsonValue,
            }),
            ...(updateData.status && {
              status: updateData.status,
              ...(updateData.status === "ACTIVE" &&
                !existingWorkflow.publishedAt && {
                  publishedAt: new Date(),
                  publishedById: ctx.user.id,
                }),
            }),
            updatedById: ctx.user.id,
          },
          include: {
            triggers: true,
            nodes: true,
            connections: true,
          },
        });

        return updatedWorkflow;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to update workflow:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update workflow",
        });
      }
    }),

  // Sync canvas (nodes and connections) transactionally
  syncCanvas: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        organizationId: z.string().cuid(),
        workflowId: z.string().cuid(),
        nodes: z.array(
          z.object({
            nodeId: z.string().min(1),
            type: WorkflowNodeTypeSchema,
            name: z.string().min(1).max(100),
            description: z.string().optional(),
            position: z.object({
              x: z.number(),
              y: z.number(),
            }),
            config: z.record(z.unknown()).optional(),
            template: z.record(z.unknown()).optional(),
            executionOrder: z.number().optional(),
            isOptional: z.boolean().default(false),
            retryLimit: z.number().min(0).max(10).default(3),
            timeout: z.number().min(1).optional(),
            conditions: z.record(z.unknown()).optional(),
          })
        ),
        connections: z.array(
          z.object({
            edgeId: z.string(),
            sourceNodeId: z.string(), // React Flow source node ID
            targetNodeId: z.string(), // React Flow target node ID
            sourceHandle: z.string().optional(),
            targetHandle: z.string().optional(),
            label: z.string().optional(),
            conditions: z.record(z.unknown()).optional(),
            style: z.record(z.unknown()).optional(),
            animated: z.boolean().default(false),
            executionOrder: z.number().int().default(1),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify workflow belongs to organization
        const workflow = await db.workflow.findFirst({
          where: {
            id: input.workflowId,
            organizationId: input.organizationId,
          },
        });

        if (!workflow) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow not found",
          });
        }

        const result = await db.$transaction(async tx => {
          // 1. Sync nodes first
          const nodesWithValidatedConfig = input.nodes.map(node => {
            const validatedConfig = parseConfigForType(node.type, node.config);

            if (
              requiresConfigTypes.has(node.type) &&
              validatedConfig === null
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `${node.type} nodes require configuration`,
              });
            }

            return {
              ...node,
              config: validatedConfig ?? undefined,
            };
          });

          const currentNodes = await tx.workflowNode.findMany({
            where: { workflowId: input.workflowId },
            select: { nodeId: true, id: true },
          });

          const currentNodeIds = new Set(currentNodes.map(n => n.nodeId));
          const newNodeIds = new Set(
            nodesWithValidatedConfig.map(n => n.nodeId)
          );

          // Delete nodes that are no longer present (cascade will handle connections)
          const nodesToDelete = [...currentNodeIds].filter(
            id => !newNodeIds.has(id)
          );
          if (nodesToDelete.length > 0) {
            await tx.workflowNode.deleteMany({
              where: {
                workflowId: input.workflowId,
                nodeId: { in: nodesToDelete },
              },
            });
          }

          // Upsert all provided nodes
          const upsertedNodes = await Promise.all(
            nodesWithValidatedConfig.map(node =>
              tx.workflowNode.upsert({
                where: {
                  workflowId_nodeId: {
                    workflowId: input.workflowId,
                    nodeId: node.nodeId,
                  },
                },
                create: {
                  workflowId: input.workflowId,
                  nodeId: node.nodeId,
                  type: node.type,
                  name: node.name,
                  description: node.description,
                  position: node.position as Prisma.InputJsonValue,
                  config: node.config as Prisma.InputJsonValue,
                  template: node.template as Prisma.InputJsonValue,
                  executionOrder: node.executionOrder,
                  isOptional: node.isOptional,
                  retryLimit: node.retryLimit,
                  timeout: node.timeout,
                  conditions: node.conditions as Prisma.InputJsonValue,
                },
                update: {
                  type: node.type,
                  name: node.name,
                  description: node.description,
                  position: node.position as Prisma.InputJsonValue,
                  config: node.config as Prisma.InputJsonValue,
                  template: node.template as Prisma.InputJsonValue,
                  executionOrder: node.executionOrder,
                  isOptional: node.isOptional,
                  retryLimit: node.retryLimit,
                  timeout: node.timeout,
                  conditions: node.conditions as Prisma.InputJsonValue,
                },
              })
            )
          );

          // 2. Sync connections (delete all and recreate)
          await tx.workflowConnection.deleteMany({
            where: { workflowId: input.workflowId },
          });

          const createdConnections = await Promise.all(
            input.connections.map(async conn => {
              // Map React Flow node IDs to database WorkflowNode IDs
              const [sourceNode, targetNode] = await Promise.all([
                tx.workflowNode.findFirst({
                  where: {
                    nodeId: conn.sourceNodeId,
                    workflowId: input.workflowId,
                  },
                }),
                tx.workflowNode.findFirst({
                  where: {
                    nodeId: conn.targetNodeId,
                    workflowId: input.workflowId,
                  },
                }),
              ]);

              if (!sourceNode || !targetNode) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message: `Node not found for connection ${conn.edgeId}`,
                });
              }

              return tx.workflowConnection.create({
                data: {
                  workflowId: input.workflowId,
                  edgeId: conn.edgeId,
                  sourceNodeId: sourceNode.id,
                  targetNodeId: targetNode.id,
                  executionOrder: conn.executionOrder,
                  sourceHandle: conn.sourceHandle,
                  targetHandle: conn.targetHandle,
                  label: conn.label,
                  conditions: conn.conditions as Prisma.InputJsonValue,
                  style: conn.style as Prisma.InputJsonValue,
                  animated: conn.animated,
                },
              });
            })
          );

          return {
            nodes: upsertedNodes,
            connections: createdConnections,
          };
        });

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to sync canvas:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to sync canvas",
        });
      }
    }),

  // Delete workflow
  deleteWorkflow: createPermissionProcedure(PERMISSIONS.WORKFLOWS_ADMIN)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify workflow exists and belongs to organization
        const existingWorkflow = await db.workflow.findFirst({
          where: {
            id: input.id,
            organizationId: input.organizationId,
          },
        });

        if (!existingWorkflow) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow not found",
          });
        }

        // Check if workflow has active executions
        const activeExecutions = await db.workflowExecution.count({
          where: {
            workflowId: input.id,
            status: {
              in: ["PENDING", "RUNNING", "PAUSED"],
            },
          },
        });

        if (activeExecutions > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Cannot delete workflow with active executions",
          });
        }

        await db.workflow.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to delete workflow:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete workflow",
        });
      }
    }),

  // Archive workflow
  archiveWorkflow: createPermissionProcedure(PERMISSIONS.WORKFLOWS_ADMIN)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        const workflow = await db.workflow.update({
          where: {
            id: input.id,
            organizationId: input.organizationId,
          },
          data: {
            status: "ARCHIVED",
            archivedAt: new Date(),
            updatedById: ctx.user.id,
          },
        });

        return workflow;
      } catch (error) {
        console.error("Failed to archive workflow:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to archive workflow",
        });
      }
    }),
});
