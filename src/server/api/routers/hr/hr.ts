import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { PayrollStatusSchema } from "../../../../../prisma/generated/zod";

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

        // Destructure to exclude organizationId from Prisma data (it's used for validation only)
        const { organizationId: _, ...payrollData } = input;
        
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
});
