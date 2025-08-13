import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  PayrollStatusSchema,
  TimeOffTypeSchema,
  TimeOffStatusSchema,
} from "../../../../../prisma/generated/zod";

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

  // ==============================
  // Payroll: Schemas
  // ==============================
  // Create payroll input
  createPayroll: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
        employeeId: z.string().cuid(),
        payPeriodStart: z.coerce.date(),
        payPeriodEnd: z.coerce.date(),
        payDate: z.coerce.date(),
        basicSalary: z.number(),
        overtime: z.number().optional(),
        bonus: z.number().optional(),
        tax: z.number().optional(),
        deductions: z.number().optional(),
        currency: z.string().optional(),
        status: PayrollStatusSchema,
        notes: z.string().optional(),
        createdById: z.string().cuid().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Ensure employee belongs to organization
        const employee = await db.employee.findFirst({
          where: { id: input.employeeId, organizationId: input.organizationId },
          select: { id: true },
        });
        if (!employee) {
          throw new Error("Employee not found for the given organization");
        }

        const basic = new Prisma.Decimal(input.basicSalary);
        const overtime = new Prisma.Decimal(input.overtime ?? 0);
        const bonus = new Prisma.Decimal(input.bonus ?? 0);
        const tax = new Prisma.Decimal(input.tax ?? 0);
        const deductions = new Prisma.Decimal(input.deductions ?? 0);
        const netAmount = basic
          .plus(overtime)
          .plus(bonus)
          .minus(tax)
          .minus(deductions);

        // Exclude organizationId from prisma create data without binding
        const { organizationId: _unused, ...payrollData } = input;
        void _unused;

        const payroll = await db.payroll.create({
          data: {
            ...payrollData,
            basicSalary: basic,
            overtime,
            bonus,
            tax,
            deductions,
            netAmount,
          },
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } },
          },
        });

        return payroll;
      } catch (error) {
        console.error("Failed to create payroll:", error);
        throw new Error("Failed to create payroll");
      }
    }),

  // Update payroll
  updatePayroll: publicProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
        employeeId: z.string().cuid().optional(),
        payPeriodStart: z.coerce.date().optional(),
        payPeriodEnd: z.coerce.date().optional(),
        payDate: z.coerce.date().optional(),
        basicSalary: z.number().optional(),
        overtime: z.number().optional(),
        bonus: z.number().optional(),
        tax: z.number().optional(),
        deductions: z.number().optional(),
        currency: z.string().optional(),
        status: PayrollStatusSchema.optional(),
        notes: z.string().optional(),
        updatedById: z.string().cuid().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const existing = await db.payroll.findUnique({
          where: { id: input.id },
          include: { employee: { select: { organizationId: true } } },
        });
        if (
          !existing ||
          existing.employee.organizationId !== input.organizationId
        ) {
          throw new Error("Payroll not found for the given organization");
        }

        // If employeeId is provided, validate organization consistency
        if (input.employeeId) {
          const employee = await db.employee.findFirst({
            where: {
              id: input.employeeId,
              organizationId: input.organizationId,
            },
            select: { id: true },
          });
          if (!employee) {
            throw new Error(
              "Target employee not found for the given organization"
            );
          }
        }

        // Compute net using updated values or existing values
        const basic = new Prisma.Decimal(
          input.basicSalary ?? existing.basicSalary
        );
        const overtime = new Prisma.Decimal(
          input.overtime ?? existing.overtime ?? 0
        );
        const bonus = new Prisma.Decimal(input.bonus ?? existing.bonus ?? 0);
        const tax = new Prisma.Decimal(input.tax ?? existing.tax ?? 0);
        const deductions = new Prisma.Decimal(
          input.deductions ?? existing.deductions ?? 0
        );
        const netAmount = basic
          .plus(overtime)
          .plus(bonus)
          .minus(tax)
          .minus(deductions);

        const payroll = await db.payroll.update({
          where: { id: input.id },
          data: {
            employeeId: input.employeeId ?? existing.employeeId,
            payPeriodStart: input.payPeriodStart ?? existing.payPeriodStart,
            payPeriodEnd: input.payPeriodEnd ?? existing.payPeriodEnd,
            payDate: input.payDate ?? existing.payDate,
            basicSalary: basic,
            overtime,
            bonus,
            tax,
            deductions,
            netAmount,
            currency: input.currency ?? existing.currency,
            status: input.status ?? existing.status,
            notes: input.notes ?? existing.notes ?? undefined,
          },
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } },
          },
        });

        return payroll;
      } catch (error) {
        console.error("Failed to update payroll:", error);
        throw new Error("Failed to update payroll");
      }
    }),

  // Delete payroll
  deletePayroll: publicProcedure
    .input(
      z.object({ id: z.string().cuid(), organizationId: z.string().cuid() })
    )
    .mutation(async ({ input }) => {
      try {
        const existing = await db.payroll.findUnique({
          where: { id: input.id },
          include: { employee: { select: { organizationId: true } } },
        });
        if (
          !existing ||
          existing.employee.organizationId !== input.organizationId
        ) {
          throw new Error("Payroll not found for the given organization");
        }

        const deleted = await db.payroll.delete({ where: { id: input.id } });
        return { success: true, deletedId: deleted.id };
      } catch (error) {
        console.error("Failed to delete payroll:", error);
        throw new Error("Failed to delete payroll");
      }
    }),

  // Get payroll by ID
  getPayrollById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input }) => {
      try {
        const payroll = await db.payroll.findUnique({
          where: { id: input.id },
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } },
          },
        });
        if (!payroll) {
          throw new Error("Payroll not found");
        }
        return payroll;
      } catch (error) {
        console.error("Failed to fetch payroll:", error);
        throw new Error("Failed to fetch payroll");
      }
    }),

  // List payrolls by organization with optional filters
  getPayrollsByOrganization: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
        employeeId: z.string().cuid().optional(),
        status: PayrollStatusSchema.optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const payrolls = await db.payroll.findMany({
          where: {
            employee: {
              is: {
                organizationId: input.organizationId,
                id: input.employeeId ?? undefined,
              },
            },
            status: input.status ?? undefined,
            payDate:
              (input.from ?? input.to)
                ? {
                    gte: input.from ?? undefined,
                    lte: input.to ?? undefined,
                  }
                : undefined,
          },
          orderBy: { payDate: "desc" },
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } },
          },
        });
        return payrolls;
      } catch (error) {
        console.error("Failed to fetch payrolls:", error);
        throw new Error("Failed to fetch payrolls");
      }
    }),

  // ==============================
  // Time-Off Management
  // ==============================

  // Create time-off request
  createTimeOff: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
        employeeId: z.string().cuid(),
        type: TimeOffTypeSchema,
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        reason: z.string().optional(),
        status: TimeOffStatusSchema.optional().default("PENDING"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Ensure employee belongs to organization
        const employee = await db.employee.findFirst({
          where: {
            id: input.employeeId,
            organizationId: input.organizationId,
          },
        });

        if (!employee) {
          throw new Error("Employee not found in this organization");
        }

        // Calculate duration in days
        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);
        const duration =
          Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          ) + 1;

        const timeOff = await db.timeOff.create({
          data: {
            employeeId: input.employeeId,
            type: input.type,
            startDate: input.startDate,
            endDate: input.endDate,
            duration,
            reason: input.reason,
            status: input.status ?? "PENDING",
          },
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                department: true,
              },
            },
          },
        });

        return timeOff;
      } catch (error) {
        console.error("Failed to create time-off request:", error);
        throw new Error("Failed to create time-off request");
      }
    }),

  // Update time-off request
  updateTimeOff: publicProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
        type: TimeOffTypeSchema.optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        reason: z.string().optional(),
        status: TimeOffStatusSchema.optional(),
        approvedById: z.string().cuid().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Verify time-off belongs to organization
        const existing = await db.timeOff.findUnique({
          where: { id: input.id },
          include: {
            employee: {
              select: { organizationId: true },
            },
          },
        });

        if (
          !existing ||
          existing.employee.organizationId !== input.organizationId
        ) {
          throw new Error("Time-off request not found for this organization");
        }

        // Calculate new duration if dates are updated
        let duration = existing.duration;
        if (input.startDate || input.endDate) {
          const startDate = input.startDate ?? existing.startDate;
          const endDate = input.endDate ?? existing.endDate;
          duration =
            Math.ceil(
              (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            ) + 1;
        }

        // Set approval timestamp if status is being approved
        const approvedAt =
          input.status === "APPROVED" && existing.status !== "APPROVED"
            ? new Date()
            : existing.approvedAt;

        const timeOff = await db.timeOff.update({
          where: { id: input.id },
          data: {
            type: input.type ?? existing.type,
            startDate: input.startDate ?? existing.startDate,
            endDate: input.endDate ?? existing.endDate,
            duration,
            reason: input.reason ?? existing.reason,
            status: input.status ?? existing.status,
            approvedById: input.approvedById ?? existing.approvedById,
            approvedAt,
          },
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                department: true,
              },
            },
          },
        });

        return timeOff;
      } catch (error) {
        console.error("Failed to update time-off request:", error);
        throw new Error("Failed to update time-off request");
      }
    }),

  // Delete time-off request
  deleteTimeOff: publicProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Verify time-off belongs to organization
        const existing = await db.timeOff.findUnique({
          where: { id: input.id },
          include: {
            employee: {
              select: { organizationId: true },
            },
          },
        });

        if (
          !existing ||
          existing.employee.organizationId !== input.organizationId
        ) {
          throw new Error("Time-off request not found for this organization");
        }

        const deleted = await db.timeOff.delete({
          where: { id: input.id },
        });

        return { success: true, deletedId: deleted.id };
      } catch (error) {
        console.error("Failed to delete time-off request:", error);
        throw new Error("Failed to delete time-off request");
      }
    }),

  // Get time-off request by ID
  getTimeOffById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input }) => {
      try {
        const timeOff = await db.timeOff.findUnique({
          where: { id: input.id },
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                department: true,
                position: true,
              },
            },
          },
        });

        if (!timeOff) {
          throw new Error("Time-off request not found");
        }

        return timeOff;
      } catch (error) {
        console.error("Failed to fetch time-off request:", error);
        throw new Error("Failed to fetch time-off request");
      }
    }),

  // List time-off requests by organization with filters
  getTimeOffByOrganization: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
        employeeId: z.string().cuid().optional(),
        status: TimeOffStatusSchema.optional(),
        type: TimeOffTypeSchema.optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const timeOffRequests = await db.timeOff.findMany({
          where: {
            employee: {
              organizationId: input.organizationId,
              id: input.employeeId ?? undefined,
            },
            status: input.status ?? undefined,
            type: input.type ?? undefined,
            AND: [
              input.from ? { endDate: { gte: input.from } } : {},
              input.to ? { startDate: { lte: input.to } } : {},
            ],
          },
          orderBy: [{ status: "asc" }, { startDate: "desc" }],
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                department: true,
                position: true,
              },
            },
          },
        });

        return timeOffRequests;
      } catch (error) {
        console.error("Failed to fetch time-off requests:", error);
        throw new Error("Failed to fetch time-off requests");
      }
    }),

  // Get time-off statistics
  getTimeOffStats: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
        year: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const year = input.year ?? new Date().getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31);

        const [
          totalRequests,
          pendingRequests,
          approvedRequests,
          deniedRequests,
          upcomingTimeOff,
          currentlyOnLeave,
        ] = await Promise.all([
          // Total requests for the year
          db.timeOff.count({
            where: {
              employee: { organizationId: input.organizationId },
              startDate: { gte: startOfYear, lte: endOfYear },
            },
          }),
          // Pending requests
          db.timeOff.count({
            where: {
              employee: { organizationId: input.organizationId },
              status: "PENDING",
            },
          }),
          // Approved requests for the year
          db.timeOff.count({
            where: {
              employee: { organizationId: input.organizationId },
              status: "APPROVED",
              startDate: { gte: startOfYear, lte: endOfYear },
            },
          }),
          // Denied requests for the year
          db.timeOff.count({
            where: {
              employee: { organizationId: input.organizationId },
              status: "DENIED",
              startDate: { gte: startOfYear, lte: endOfYear },
            },
          }),
          // Upcoming approved time-off
          db.timeOff.count({
            where: {
              employee: { organizationId: input.organizationId },
              status: "APPROVED",
              startDate: { gt: new Date() },
            },
          }),
          // Currently on leave
          db.timeOff.count({
            where: {
              employee: { organizationId: input.organizationId },
              status: "APPROVED",
              startDate: { lte: new Date() },
              endDate: { gte: new Date() },
            },
          }),
        ]);

        // Calculate time-off by type
        const timeOffByType = await db.timeOff.groupBy({
          by: ["type"],
          where: {
            employee: { organizationId: input.organizationId },
            status: "APPROVED",
            startDate: { gte: startOfYear, lte: endOfYear },
          },
          _sum: {
            duration: true,
          },
          _count: true,
        });

        return {
          totalRequests,
          pendingRequests,
          approvedRequests,
          deniedRequests,
          upcomingTimeOff,
          currentlyOnLeave,
          timeOffByType: timeOffByType.map(item => ({
            type: item.type,
            count: item._count,
            totalDays: item._sum.duration ?? 0,
          })),
        };
      } catch (error) {
        console.error("Failed to fetch time-off statistics:", error);
        throw new Error("Failed to fetch time-off statistics");
      }
    }),
});
