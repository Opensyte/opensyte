import { z } from "zod";
import {
  createTRPCRouter,
  createPermissionProcedure,
  createAnyPermissionProcedure,
} from "../../../trpc";
import { PERMISSIONS } from "~/lib/rbac";
import { db } from "~/server/db";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { WorkflowNodeTypeSchema } from "../../../../../../prisma/generated/zod";

// Workflow nodes router that matches actual Prisma schema
export const nodesRouter = createTRPCRouter({
  // Get workflow nodes
  getNodes: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        workflowId: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

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

        const nodes = await db.workflowNode.findMany({
          where: {
            workflowId: input.workflowId,
          },
          select: {
            id: true,
            nodeId: true,
            type: true,
            name: true,
            description: true,
            position: true,
            config: true,
            template: true,
            executionOrder: true,
            isOptional: true,
            retryLimit: true,
            timeout: true,
            conditions: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [{ createdAt: "asc" }],
        });

        return nodes;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch nodes:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch nodes",
        });
      }
    }),

  // Create workflow node
  createNode: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        workflowId: z.string().cuid(),
        organizationId: z.string().cuid(),
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

        // Use upsert to prevent P2002 unique constraint errors
        const node = await db.workflowNode.upsert({
          where: {
            workflowId_nodeId: {
              workflowId: input.workflowId,
              nodeId: input.nodeId,
            },
          },
          create: {
            workflowId: input.workflowId,
            nodeId: input.nodeId,
            type: input.type,
            name: input.name,
            description: input.description,
            position: input.position as Prisma.InputJsonValue,
            config: input.config as Prisma.InputJsonValue,
            template: input.template as Prisma.InputJsonValue,
            executionOrder: input.executionOrder,
            isOptional: input.isOptional,
            retryLimit: input.retryLimit,
            timeout: input.timeout,
            conditions: input.conditions as Prisma.InputJsonValue,
          },
          update: {
            type: input.type,
            name: input.name,
            description: input.description,
            position: input.position as Prisma.InputJsonValue,
            config: input.config as Prisma.InputJsonValue,
            template: input.template as Prisma.InputJsonValue,
            executionOrder: input.executionOrder,
            isOptional: input.isOptional,
            retryLimit: input.retryLimit,
            timeout: input.timeout,
            conditions: input.conditions as Prisma.InputJsonValue,
          },
        });

        return node;
      } catch (error) {
        console.error("Failed to create/update node:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create/update node",
        });
      }
    }),

  // Idempotent upsert workflow node
  upsertNode: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        workflowId: z.string().cuid(),
        organizationId: z.string().cuid(),
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

        const node = await db.workflowNode.upsert({
          where: {
            workflowId_nodeId: {
              workflowId: input.workflowId,
              nodeId: input.nodeId,
            },
          },
          create: {
            workflowId: input.workflowId,
            nodeId: input.nodeId,
            type: input.type,
            name: input.name,
            description: input.description,
            position: input.position as Prisma.InputJsonValue,
            config: input.config as Prisma.InputJsonValue,
            template: input.template as Prisma.InputJsonValue,
            executionOrder: input.executionOrder,
            isOptional: input.isOptional,
            retryLimit: input.retryLimit,
            timeout: input.timeout,
            conditions: input.conditions as Prisma.InputJsonValue,
          },
          update: {
            type: input.type,
            name: input.name,
            description: input.description,
            position: input.position as Prisma.InputJsonValue,
            config: input.config as Prisma.InputJsonValue,
            template: input.template as Prisma.InputJsonValue,
            executionOrder: input.executionOrder,
            isOptional: input.isOptional,
            retryLimit: input.retryLimit,
            timeout: input.timeout,
            conditions: input.conditions as Prisma.InputJsonValue,
          },
        });

        return node;
      } catch (error) {
        console.error("Failed to upsert node:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upsert node",
        });
      }
    }),

  // Bulk sync nodes
  syncNodes: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
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
          // Get current nodeIds to determine which to delete
          const currentNodes = await tx.workflowNode.findMany({
            where: { workflowId: input.workflowId },
            select: { nodeId: true },
          });

          const currentNodeIds = new Set(currentNodes.map(n => n.nodeId));
          const newNodeIds = new Set(input.nodes.map(n => n.nodeId));

          // Delete nodes that are no longer present
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
            input.nodes.map(node =>
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

          return upsertedNodes;
        });

        return result;
      } catch (error) {
        console.error("Failed to sync nodes:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to sync nodes",
        });
      }
    }),

  // Update workflow node
  updateNode: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        position: z
          .object({
            x: z.number(),
            y: z.number(),
          })
          .optional(),
        config: z.record(z.unknown()).optional(),
        template: z.record(z.unknown()).optional(),
        executionOrder: z.number().optional(),
        isOptional: z.boolean().optional(),
        retryLimit: z.number().min(0).max(10).optional(),
        timeout: z.number().min(1).optional(),
        conditions: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const { id, organizationId, ...updateData } = input;

      try {
        // Verify node exists and belongs to organization
        const existingNode = await db.workflowNode.findFirst({
          where: {
            id,
            workflow: {
              organizationId,
            },
          },
        });

        if (!existingNode) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Node not found",
          });
        }

        const updatedNode = await db.workflowNode.update({
          where: { id },
          data: {
            ...(updateData.name && { name: updateData.name }),
            ...(updateData.description !== undefined && {
              description: updateData.description,
            }),
            ...(updateData.position && {
              position: updateData.position as Prisma.InputJsonValue,
            }),
            ...(updateData.config && {
              config: updateData.config as Prisma.InputJsonValue,
            }),
            ...(updateData.template && {
              template: updateData.template as Prisma.InputJsonValue,
            }),
            ...(updateData.executionOrder !== undefined && {
              executionOrder: updateData.executionOrder,
            }),
            ...(updateData.isOptional !== undefined && {
              isOptional: updateData.isOptional,
            }),
            ...(updateData.retryLimit !== undefined && {
              retryLimit: updateData.retryLimit,
            }),
            ...(updateData.timeout !== undefined && {
              timeout: updateData.timeout,
            }),
            ...(updateData.conditions && {
              conditions: updateData.conditions as Prisma.InputJsonValue,
            }),
          },
        });

        return updatedNode;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to update node:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update node",
        });
      }
    }),

  // Delete workflow node
  deleteNode: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify node exists and belongs to organization
        const existingNode = await db.workflowNode.findFirst({
          where: {
            id: input.id,
            workflow: {
              organizationId: input.organizationId,
            },
          },
        });

        if (!existingNode) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Node not found",
          });
        }

        await db.workflowNode.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to delete node:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete node",
        });
      }
    }),
});
