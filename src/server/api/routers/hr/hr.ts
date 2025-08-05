import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

// Employee input schemas
const createEmployeeSchema = z.object({
  organizationId: z.string().cuid(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  hireDate: z.date().optional(),
  status: z
    .enum(["ACTIVE", "ON_LEAVE", "TERMINATED", "PROBATION"])
    .default("ACTIVE"),
  managerId: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  birthDate: z.date().optional(),
  taxId: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

const updateEmployeeSchema = z.object({
  id: z.string().cuid(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  hireDate: z.date().optional(),
  terminationDate: z.date().optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED", "PROBATION"]),
  managerId: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  birthDate: z.date().optional(),
  taxId: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

export const hrRouter = createTRPCRouter({
  // Get employees by organization
  getEmployeesByOrganization: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
      })
    )
    .query(async ({ input }) => {
      try {
        const employees = await db.employee.findMany({
          where: {
            organizationId: input.organizationId,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return employees;
      } catch (error) {
        console.error("Failed to fetch employees:", error);
        throw new Error("Failed to fetch employees");
      }
    }),

  // Get employee by ID
  getEmployeeById: publicProcedure
    .input(
      z.object({
        id: z.string().cuid(),
      })
    )
    .query(async ({ input }) => {
      try {
        const employee = await db.employee.findUnique({
          where: { id: input.id },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
            payrolls: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
            timeOff: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
            performanceReviews: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        });

        if (!employee) {
          throw new Error("Employee not found");
        }

        return employee;
      } catch (error) {
        console.error("Failed to fetch employee:", error);
        throw new Error("Failed to fetch employee");
      }
    }),

  // Create new employee
  createEmployee: publicProcedure
    .input(createEmployeeSchema)
    .mutation(async ({ input }) => {
      try {
        const employee = await db.employee.create({
          data: {
            organizationId: input.organizationId,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
            position: input.position,
            department: input.department,
            hireDate: input.hireDate,
            status: input.status,
            managerId: input.managerId,
            address: input.address,
            city: input.city,
            state: input.state,
            country: input.country,
            postalCode: input.postalCode,
            birthDate: input.birthDate,
            taxId: input.taxId,
            emergencyContactName: input.emergencyContactName,
            emergencyContactPhone: input.emergencyContactPhone,
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

        return employee;
      } catch (error) {
        console.error("Failed to create employee:", error);
        throw new Error("Failed to create employee");
      }
    }),

  // Update employee
  updateEmployee: publicProcedure
    .input(updateEmployeeSchema)
    .mutation(async ({ input }) => {
      try {
        const { id, ...updateData } = input;

        const employee = await db.employee.update({
          where: { id },
          data: updateData,
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        return employee;
      } catch (error) {
        console.error("Failed to update employee:", error);
        throw new Error("Failed to update employee");
      }
    }),

  // Delete employee
  deleteEmployee: publicProcedure
    .input(
      z.object({
        id: z.string().cuid(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const employee = await db.employee.delete({
          where: { id: input.id },
        });

        return { success: true, deletedId: employee.id };
      } catch (error) {
        console.error("Failed to delete employee:", error);
        throw new Error("Failed to delete employee");
      }
    }),

  // Get employee statistics
  getEmployeeStats: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
      })
    )
    .query(async ({ input }) => {
      try {
        const [
          totalEmployees,
          activeEmployees,
          onLeaveEmployees,
          terminatedEmployees,
          probationEmployees,
        ] = await Promise.all([
          db.employee.count({
            where: { organizationId: input.organizationId },
          }),
          db.employee.count({
            where: {
              organizationId: input.organizationId,
              status: "ACTIVE",
            },
          }),
          db.employee.count({
            where: {
              organizationId: input.organizationId,
              status: "ON_LEAVE",
            },
          }),
          db.employee.count({
            where: {
              organizationId: input.organizationId,
              status: "TERMINATED",
            },
          }),
          db.employee.count({
            where: {
              organizationId: input.organizationId,
              status: "PROBATION",
            },
          }),
        ]);

        return {
          totalEmployees,
          activeEmployees,
          onLeaveEmployees,
          terminatedEmployees,
          probationEmployees,
        };
      } catch (error) {
        console.error("Failed to fetch employee statistics:", error);
        throw new Error("Failed to fetch employee statistics");
      }
    }),
});
