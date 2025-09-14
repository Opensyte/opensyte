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

export const connectionsRouter = createTRPCRouter({
  // Get connections for a workflow
  getConnections: createAnyPermissionProcedure([
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
        // Verify workflow exists and belongs to organization
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

        const connections = await db.workflowConnection.findMany({
          where: {
            workflowId: input.workflowId,
          },
          orderBy: { createdAt: "asc" },
        });

        return connections;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch connections:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch connections",
        });
      }
    }),

  // Create a new connection
  createConnection: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        workflowId: z.string().cuid(),
        organizationId: z.string().cuid(),
        edgeId: z.string(),
        sourceNodeId: z.string(), // React Flow source node ID (maps to triggerId)
        targetNodeId: z.string(), // React Flow target node ID (maps to actionId)
        sourceHandle: z.string().optional(),
        targetHandle: z.string().optional(),
        label: z.string().optional(),
        conditions: z.record(z.unknown()).optional(),
        style: z.record(z.unknown()).optional(),
        animated: z.boolean().default(false),
        executionOrder: z.number().int().default(1), // Added execution order
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify workflow exists and belongs to organization
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

        // Map React Flow node IDs to database WorkflowNode IDs
        // Both source and target can be any node type (TRIGGER or ACTION)
        const [sourceNode, targetNode] = await Promise.all([
          db.workflowNode.findFirst({
            where: {
              nodeId: input.sourceNodeId, // React Flow node ID stored in WorkflowNode.nodeId
              workflowId: input.workflowId,
            },
          }),
          db.workflowNode.findFirst({
            where: {
              nodeId: input.targetNodeId, // React Flow node ID stored in WorkflowNode.nodeId
              workflowId: input.workflowId,
            },
          }),
        ]);

        if (!sourceNode) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Source node not found",
          });
        }

        if (!targetNode) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Target node not found",
          });
        }

        // Validate connection rules (optional business logic)
        // Allow: TRIGGER → ACTION, ACTION → ACTION
        const validConnections = [
          sourceNode.type === "TRIGGER" && targetNode.type === "ACTION",
          sourceNode.type === "ACTION" && targetNode.type === "ACTION",
        ];

        if (!validConnections.some(v => v)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid connection: ${sourceNode.type} → ${targetNode.type} is not allowed`,
          });
        }

        // Check if connection already exists by edge ID
        const existingConnection = await db.workflowConnection.findFirst({
          where: {
            workflowId: input.workflowId,
            edgeId: input.edgeId,
          },
        });

        if (existingConnection) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Connection with this edge ID already exists",
          });
        }

        const connection = await db.workflowConnection.create({
          data: {
            workflowId: input.workflowId,
            edgeId: input.edgeId,
            sourceNodeId: sourceNode.id, // Database WorkflowNode.id
            targetNodeId: targetNode.id, // Database WorkflowNode.id
            executionOrder: input.executionOrder,
            sourceHandle: input.sourceHandle,
            targetHandle: input.targetHandle,
            label: input.label,
            conditions: input.conditions as Prisma.InputJsonValue,
            style: input.style as Prisma.InputJsonValue,
            animated: input.animated,
          },
        });

        return connection;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to create connection:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create connection",
        });
      }
    }),

  // Update a connection
  updateConnection: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
        label: z.string().optional(),
        conditions: z.record(z.unknown()).optional(),
        style: z.record(z.unknown()).optional(),
        animated: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const { id, organizationId, ...updateData } = input;

      try {
        // Verify connection exists and belongs to organization
        const existingConnection = await db.workflowConnection.findFirst({
          where: {
            id,
            workflow: {
              organizationId,
            },
          },
        });

        if (!existingConnection) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Connection not found",
          });
        }

        const updatedConnection = await db.workflowConnection.update({
          where: { id },
          data: {
            ...(updateData.label && { label: updateData.label }),
            ...(updateData.conditions && {
              conditions: updateData.conditions as Prisma.InputJsonValue,
            }),
            ...(updateData.style && {
              style: updateData.style as Prisma.InputJsonValue,
            }),
            ...(updateData.animated !== undefined && {
              animated: updateData.animated,
            }),
          },
        });

        return updatedConnection;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to update connection:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update connection",
        });
      }
    }),

  // Delete a connection
  deleteConnection: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify connection exists and belongs to organization
        const existingConnection = await db.workflowConnection.findFirst({
          where: {
            id: input.id,
            workflow: {
              organizationId: input.organizationId,
            },
          },
        });

        if (!existingConnection) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Connection not found",
          });
        }

        await db.workflowConnection.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to delete connection:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete connection",
        });
      }
    }),

  // Delete connection by edge ID
  deleteConnectionByEdgeId: createPermissionProcedure(
    PERMISSIONS.WORKFLOWS_WRITE
  )
    .input(
      z.object({
        workflowId: z.string().cuid(),
        organizationId: z.string().cuid(),
        edgeId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify workflow exists and belongs to organization
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

        const deletedConnection = await db.workflowConnection.deleteMany({
          where: {
            workflowId: input.workflowId,
            edgeId: input.edgeId,
          },
        });

        return { success: true, deletedCount: deletedConnection.count };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to delete connection:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete connection",
        });
      }
    }),

  // Bulk create/update connections (useful for saving canvas state)
  syncConnections: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        workflowId: z.string().cuid(),
        organizationId: z.string().cuid(),
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
            executionOrder: z.number().int().default(1), // Added execution order
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify workflow exists and belongs to organization
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

        // Use transaction to ensure atomicity
        const result = await db.$transaction(async tx => {
          // Delete existing connections for this workflow
          await tx.workflowConnection.deleteMany({
            where: {
              workflowId: input.workflowId,
            },
          });

          // Create new connections with proper ID mapping
          const createdConnections = await Promise.all(
            input.connections.map(async conn => {
              // Map React Flow node IDs to database WorkflowNode IDs
              const [sourceNode, targetNode] = await Promise.all([
                tx.workflowNode.findFirst({
                  where: {
                    nodeId: conn.sourceNodeId, // React Flow node ID
                    workflowId: input.workflowId,
                  },
                }),
                tx.workflowNode.findFirst({
                  where: {
                    nodeId: conn.targetNodeId, // React Flow node ID
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
                  sourceNodeId: sourceNode.id, // Database WorkflowNode.id
                  targetNodeId: targetNode.id, // Database WorkflowNode.id
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

          return createdConnections;
        });

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to sync connections:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to sync connections",
        });
      }
    }),
});
