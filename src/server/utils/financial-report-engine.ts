// Financial Report Calculation Engine
// Core calculation logic for different financial report types

import { type Prisma, type PaymentMethod } from "@prisma/client";
import { db } from "~/server/db";

// Report calculation result interfaces
export interface IncomeStatementData {
  period: {
    startDate: string;
    endDate: string;
  };
  revenue: {
    totalRevenue: number;
    revenueBySource: Array<{
      source: string;
      amount: number;
      percentage: number;
    }>;
  };
  expenses: {
    totalExpenses: number;
    expensesByCategory: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
    operatingExpenses: number;
    nonOperatingExpenses: number;
  };
  netIncome: number;
  grossProfit: number;
  operatingIncome: number;
  margins: {
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
  };
}

export interface BalanceSheetData {
  period: {
    asOfDate: string;
  };
  assets: {
    currentAssets: {
      cash: number;
      accountsReceivable: number;
      inventory: number;
      total: number;
    };
    nonCurrentAssets: {
      fixedAssets: number;
      intangibleAssets: number;
      total: number;
    };
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: {
      accountsPayable: number;
      shortTermDebt: number;
      total: number;
    };
    nonCurrentLiabilities: {
      longTermDebt: number;
      total: number;
    };
    totalLiabilities: number;
  };
  equity: {
    retainedEarnings: number;
    totalEquity: number;
  };
}

export interface CashFlowData {
  period: {
    startDate: string;
    endDate: string;
  };
  operatingActivities: {
    netIncome: number;
    depreciation: number;
    changeInWorkingCapital: number;
    total: number;
    activities: Array<{
      description: string;
      amount: number;
    }>;
  };
  investingActivities: {
    capitalExpenditures: number;
    total: number;
    activities: Array<{
      description: string;
      amount: number;
    }>;
  };
  financingActivities: {
    debtChanges: number;
    total: number;
    activities: Array<{
      description: string;
      amount: number;
    }>;
  };
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
}

export interface ExpenseReportData {
  period: {
    startDate: string;
    endDate: string;
  };
  totalExpenses: number;
  expensesByCategory: Array<{
    categoryId: string | null;
    categoryName: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  expensesByProject: Array<{
    projectId: string | null;
    projectName: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  expensesByVendor: Array<{
    vendor: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  expensesByPaymentMethod: Array<{
    paymentMethod: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  topExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    date: Date;
    categoryName: string;
  }>;
}

// Filter interfaces
export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

export interface ReportFilters {
  dateRange?: DateRangeFilter;
  organizationId: string;
  currency?: string;
  categories?: string[];
  projects?: string[];
  vendors?: string[];
  paymentMethods?: string[];
  includeSubcategories?: boolean;
  groupBy?: "day" | "week" | "month" | "quarter" | "year";
}

export class FinancialReportEngine {
  /**
   * Generate Income Statement
   */
  static async generateIncomeStatement(
    filters: ReportFilters
  ): Promise<IncomeStatementData> {
    const { startDate, endDate } = this.getDateRange(filters.dateRange);

    // Get revenue data (from invoices)
    const revenueData = await this.calculateRevenue(
      filters,
      startDate,
      endDate
    );

    // Get expense data
    const expenseData = await this.calculateExpenses(
      filters,
      startDate,
      endDate
    );

    const grossProfit =
      revenueData.totalRevenue - Number(expenseData.operatingExpenses);
    const operatingIncome =
      grossProfit - Number(expenseData.nonOperatingExpenses);
    const netIncome =
      revenueData.totalRevenue - Number(expenseData.totalExpenses);

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      revenue: revenueData,
      expenses: {
        totalExpenses: Number(expenseData.totalExpenses),
        expensesByCategory: expenseData.expensesByCategory.map(cat => ({
          category: cat.categoryName,
          amount: Number(cat.amount),
          percentage: cat.percentage,
        })),
        operatingExpenses: Number(expenseData.operatingExpenses),
        nonOperatingExpenses: Number(expenseData.nonOperatingExpenses),
      },
      netIncome,
      grossProfit,
      operatingIncome,
      margins: {
        grossMargin:
          revenueData.totalRevenue > 0
            ? (grossProfit / revenueData.totalRevenue) * 100
            : 0,
        operatingMargin:
          revenueData.totalRevenue > 0
            ? (operatingIncome / revenueData.totalRevenue) * 100
            : 0,
        netMargin:
          revenueData.totalRevenue > 0
            ? (netIncome / revenueData.totalRevenue) * 100
            : 0,
      },
    };
  }

  /**
   * Generate Balance Sheet
   */
  static async generateBalanceSheet(
    filters: ReportFilters
  ): Promise<BalanceSheetData> {
    const { endDate } = this.getDateRange(filters.dateRange);

    // For a simplified balance sheet, we'll calculate based on available data
    // In a full implementation, you'd have proper asset and liability tracking

    const totalExpenses = await this.getTotalExpenses(
      filters,
      undefined,
      endDate
    );
    const totalRevenue = await this.getTotalRevenue(
      filters,
      undefined,
      endDate
    );

    // Simplified balance sheet calculation
    const retainedEarnings = totalRevenue - totalExpenses;
    const estimatedCash = Math.max(retainedEarnings * 0.3, 0);
    const estimatedReceivables = Math.max(totalRevenue * 0.1, 0);
    const estimatedPayables = Math.max(totalExpenses * 0.05, 0);

    const currentAssets = {
      cash: estimatedCash,
      accountsReceivable: estimatedReceivables,
      inventory: 0,
      total: estimatedCash + estimatedReceivables,
    };

    const nonCurrentAssets = {
      fixedAssets: 0,
      intangibleAssets: 0,
      total: 0,
    };

    const totalAssets = currentAssets.total + nonCurrentAssets.total;

    const currentLiabilities = {
      accountsPayable: estimatedPayables,
      shortTermDebt: 0,
      total: estimatedPayables,
    };

    const nonCurrentLiabilities = {
      longTermDebt: 0,
      total: 0,
    };

    const totalLiabilities =
      currentLiabilities.total + nonCurrentLiabilities.total;
    const totalEquity = totalAssets - totalLiabilities;

    return {
      period: {
        asOfDate: endDate.toISOString(),
      },
      assets: {
        currentAssets,
        nonCurrentAssets,
        totalAssets,
      },
      liabilities: {
        currentLiabilities,
        nonCurrentLiabilities,
        totalLiabilities,
      },
      equity: {
        retainedEarnings,
        totalEquity,
      },
    };
  }

  /**
   * Generate Cash Flow Statement
   */
  static async generateCashFlow(filters: ReportFilters): Promise<CashFlowData> {
    const { startDate, endDate } = this.getDateRange(filters.dateRange);

    // Get net income from income statement
    const incomeStatement = await this.generateIncomeStatement(filters);
    const netIncome = incomeStatement.netIncome;

    // Operating activities
    const operatingActivities = {
      netIncome,
      depreciation: 0, // Would need asset depreciation tracking
      changeInWorkingCapital: 0, // Would need working capital calculation
      total: netIncome,
      activities: [
        { description: "Net Income", amount: netIncome },
        { description: "Depreciation", amount: 0 },
        { description: "Change in Working Capital", amount: 0 },
      ],
    };

    // Investing activities (simplified)
    const investingActivities = {
      capitalExpenditures: 0,
      total: 0,
      activities: [{ description: "Capital Expenditures", amount: 0 }],
    };

    // Financing activities (simplified)
    const financingActivities = {
      debtChanges: 0,
      total: 0,
      activities: [{ description: "Net Borrowing", amount: 0 }],
    };

    const netCashFlow =
      operatingActivities.total +
      investingActivities.total +
      financingActivities.total;

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      operatingActivities,
      investingActivities,
      financingActivities,
      netCashFlow,
      beginningCash: 0, // Would need cash balance tracking
      endingCash: netCashFlow,
    };
  }

  /**
   * Generate Expense Report
   */
  static async generateExpenseReport(
    filters: ReportFilters
  ): Promise<ExpenseReportData> {
    const { startDate, endDate } = this.getDateRange(filters.dateRange);

    const whereClause = this.buildExpenseWhereClause(
      filters,
      startDate,
      endDate
    );

    // Get total expenses
    const totalExpensesResult = await db.expense.aggregate({
      where: whereClause,
      _sum: { amount: true },
    });

    const totalExpenses = Number(totalExpensesResult._sum.amount ?? 0);

    // Expenses by category
    const expensesByCategory = await this.getExpensesByCategory(
      whereClause,
      totalExpenses
    );

    // Expenses by project
    const expensesByProject = await this.getExpensesByProject(
      whereClause,
      totalExpenses
    );

    // Expenses by vendor
    const expensesByVendor = await this.getExpensesByVendor(
      whereClause,
      totalExpenses
    );

    // Expenses by payment method
    const expensesByPaymentMethod = await this.getExpensesByPaymentMethod(
      whereClause,
      totalExpenses
    );

    // Top expenses
    const topExpenses = await db.expense.findMany({
      where: whereClause,
      orderBy: { amount: "desc" },
      take: 10,
      include: {
        category: true,
      },
    });

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totalExpenses: Number(totalExpenses),
      expensesByCategory: expensesByCategory.map(cat => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        amount: Number(cat.amount),
        percentage: cat.percentage,
        count: cat.count,
      })),
      expensesByProject: expensesByProject.map(proj => ({
        projectId: proj.projectId,
        projectName: proj.projectName,
        amount: Number(proj.amount),
        percentage: proj.percentage,
        count: proj.count,
      })),
      expensesByVendor: expensesByVendor.map(vendor => ({
        vendor: vendor.vendor,
        amount: Number(vendor.amount),
        percentage: vendor.percentage,
        count: vendor.count,
      })),
      expensesByPaymentMethod: expensesByPaymentMethod.map(pm => ({
        paymentMethod: pm.paymentMethod.toString(),
        amount: Number(pm.amount),
        percentage: pm.percentage,
        count: pm.count,
      })),
      topExpenses: topExpenses.map(expense => ({
        id: expense.id,
        description: expense.description ?? "No description",
        amount: Number(expense.amount),
        date: expense.date,
        categoryName:
          expense.category?.name ?? expense.customCategory ?? "Uncategorized",
      })),
    };
  }

  // Helper methods
  private static getDateRange(dateRange?: DateRangeFilter): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), 0, 1); // Start of current year
    const defaultEndDate = now;

    return {
      startDate: dateRange?.startDate ?? defaultStartDate,
      endDate: dateRange?.endDate ?? defaultEndDate,
    };
  }

  private static buildExpenseWhereClause(
    filters: ReportFilters,
    startDate: Date,
    endDate: Date
  ): Prisma.ExpenseWhereInput {
    const where: Prisma.ExpenseWhereInput = {
      organizationId: filters.organizationId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (filters.categories?.length) {
      where.OR = [
        { categoryId: { in: filters.categories } },
        { customCategory: { in: filters.categories } },
      ];
    }

    if (filters.projects?.length) {
      where.projectId = { in: filters.projects };
    }

    if (filters.vendors?.length) {
      where.vendor = { in: filters.vendors };
    }

    if (filters.paymentMethods?.length) {
      where.paymentMethod = { in: filters.paymentMethods as PaymentMethod[] };
    }

    return where;
  }

  private static async calculateRevenue(
    filters: ReportFilters,
    startDate: Date,
    endDate: Date
  ) {
    // Get revenue from invoices using totalAmount field
    const invoiceRevenue = await db.invoice.aggregate({
      where: {
        organizationId: filters.organizationId,
        issueDate: {
          gte: startDate,
          lte: endDate,
        },
        status: "PAID",
      },
      _sum: { totalAmount: true },
    });

    const totalRevenue = Number(invoiceRevenue._sum.totalAmount ?? 0);

    // Get revenue by source (simplified - using customer as source)
    const revenueByCustomer = await db.invoice.groupBy({
      by: ["customerId"],
      where: {
        organizationId: filters.organizationId,
        issueDate: {
          gte: startDate,
          lte: endDate,
        },
        status: "PAID",
      },
      _sum: { totalAmount: true },
      _count: true,
    });

    const revenueBySource = await Promise.all(
      revenueByCustomer.map(async item => {
        const customer = await db.customer.findUnique({
          where: { id: item.customerId },
          select: { firstName: true, lastName: true, company: true },
        });

        const amount = Number(item._sum.totalAmount ?? 0);
        const customerName = customer
          ? (customer.company ?? `${customer.firstName} ${customer.lastName}`)
          : "Unknown Customer";

        return {
          source: customerName,
          amount,
          percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
        };
      })
    );

    return {
      totalRevenue,
      revenueBySource,
    };
  }

  private static async calculateExpenses(
    filters: ReportFilters,
    startDate: Date,
    endDate: Date
  ) {
    const whereClause = this.buildExpenseWhereClause(
      filters,
      startDate,
      endDate
    );

    const totalExpensesResult = await db.expense.aggregate({
      where: whereClause,
      _sum: { amount: true },
    });

    const totalExpenses = totalExpensesResult._sum.amount ?? 0;

    // Get expenses by category for breakdown
    const expensesByCategory = await this.getExpensesByCategory(
      whereClause,
      Number(totalExpenses)
    );

    // For simplified calculation, consider all expenses as operating expenses
    const operatingExpenses = Number(totalExpenses);
    const nonOperatingExpenses = 0;

    return {
      totalExpenses: Number(totalExpenses),
      expensesByCategory,
      operatingExpenses,
      nonOperatingExpenses,
    };
  }

  private static async getTotalExpenses(
    filters: ReportFilters,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    const dateRange = this.getDateRange({ startDate, endDate });
    const whereClause = this.buildExpenseWhereClause(
      filters,
      dateRange.startDate,
      dateRange.endDate
    );

    const result = await db.expense.aggregate({
      where: whereClause,
      _sum: { amount: true },
    });

    return Number(result._sum.amount ?? 0);
  }

  private static async getTotalRevenue(
    filters: ReportFilters,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    const dateRange = this.getDateRange({ startDate, endDate });

    const result = await db.invoice.aggregate({
      where: {
        organizationId: filters.organizationId,
        issueDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
        status: "PAID",
      },
      _sum: { totalAmount: true },
    });

    return Number(result._sum.totalAmount ?? 0);
  }

  private static async getExpensesByCategory(
    whereClause: Prisma.ExpenseWhereInput,
    totalExpenses: number
  ) {
    const categoryExpenses = await db.expense.groupBy({
      by: ["categoryId", "customCategory"],
      where: whereClause,
      _sum: { amount: true },
      _count: true,
    });

    return Promise.all(
      categoryExpenses.map(async item => {
        const amount = Number(item._sum.amount ?? 0);
        let categoryName = "Uncategorized";

        if (item.categoryId) {
          const category = await db.expenseCategory.findUnique({
            where: { id: item.categoryId },
            select: { name: true },
          });
          categoryName = category?.name ?? "Unknown Category";
        } else if (item.customCategory) {
          categoryName = item.customCategory;
        }

        return {
          categoryId: item.categoryId,
          categoryName,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
          count: item._count,
        };
      })
    );
  }

  private static async getExpensesByProject(
    whereClause: Prisma.ExpenseWhereInput,
    totalExpenses: number
  ) {
    const projectExpenses = await db.expense.groupBy({
      by: ["projectId"],
      where: whereClause,
      _sum: { amount: true },
      _count: true,
    });

    return Promise.all(
      projectExpenses.map(async item => {
        const amount = Number(item._sum.amount ?? 0);
        let projectName = "No Project";

        if (item.projectId) {
          const project = await db.project.findUnique({
            where: { id: item.projectId },
            select: { name: true },
          });
          projectName = project?.name ?? "Unknown Project";
        }

        return {
          projectId: item.projectId,
          projectName,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
          count: item._count,
        };
      })
    );
  }

  private static async getExpensesByVendor(
    whereClause: Prisma.ExpenseWhereInput,
    totalExpenses: number
  ) {
    const vendorExpenses = await db.expense.groupBy({
      by: ["vendor"],
      where: {
        ...whereClause,
        vendor: { not: null },
      },
      _sum: { amount: true },
      _count: true,
    });

    return vendorExpenses.map(item => {
      const amount = Number(item._sum.amount ?? 0);
      return {
        vendor: item.vendor ?? "Unknown Vendor",
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        count: item._count,
      };
    });
  }

  private static async getExpensesByPaymentMethod(
    whereClause: Prisma.ExpenseWhereInput,
    totalExpenses: number
  ) {
    const paymentMethodExpenses = await db.expense.groupBy({
      by: ["paymentMethod"],
      where: {
        ...whereClause,
        paymentMethod: { not: undefined },
      },
      _sum: { amount: true },
      _count: true,
    });

    return paymentMethodExpenses.map(item => {
      const amount = Number(item._sum.amount ?? 0);
      return {
        paymentMethod: item.paymentMethod ?? "Unknown",
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        count: item._count,
      };
    });
  }
}
