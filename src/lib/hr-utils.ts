// HR utility functions using the generated Zod types
import type {
  Employee,
  EmployeeWithComputedFields,
  EmployeeStatusType,
} from "~/types/hr";
import { employeeStatusLabels, employeeStatusColors } from "~/types/hr";

/**
 * Converts an Employee to EmployeeWithComputedFields by adding computed properties
 */
export function enrichEmployeeData(
  employee: Employee
): EmployeeWithComputedFields {
  const fullName = `${employee.firstName} ${employee.lastName}`;
  const displayStatus = employeeStatusLabels[employee.status];

  let yearsOfService: number | undefined;
  if (employee.hireDate) {
    const now = new Date();
    const hireDate = new Date(employee.hireDate);
    yearsOfService = Math.floor(
      (now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
    );
  }

  const isOnProbation = employee.status === "PROBATION";
  const isTerminated = employee.status === "TERMINATED";

  return {
    ...employee,
    fullName,
    displayStatus,
    yearsOfService,
    isOnProbation,
    isTerminated,
  };
}

/**
 * Gets the appropriate CSS classes for employee status badge
 */
export function getEmployeeStatusClasses(status: EmployeeStatusType): string {
  return employeeStatusColors[status];
}

/**
 * Filters employees by status
 */
export function filterEmployeesByStatus(
  employees: Employee[],
  status: EmployeeStatusType | "all"
): Employee[] {
  if (status === "all") {
    return employees;
  }
  return employees.filter(employee => employee.status === status);
}

/**
 * Groups employees by department
 */
export function groupEmployeesByDepartment(
  employees: Employee[]
): Record<string, Employee[]> {
  return employees.reduce(
    (acc, employee) => {
      const department = employee.department ?? "No Department";
      if (!acc[department]) {
        acc[department] = [];
      }
      acc[department].push(employee);
      return acc;
    },
    {} as Record<string, Employee[]>
  );
}

/**
 * Gets employee statistics
 */
export function getEmployeeStatistics(employees: Employee[]) {
  const total = employees.length;
  const active = employees.filter(emp => emp.status === "ACTIVE").length;
  const onLeave = employees.filter(emp => emp.status === "ON_LEAVE").length;
  const probation = employees.filter(emp => emp.status === "PROBATION").length;
  const terminated = employees.filter(
    emp => emp.status === "TERMINATED"
  ).length;

  return {
    total,
    active,
    onLeave,
    probation,
    terminated,
    activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
  };
}

/**
 * Searches employees by multiple fields
 */
export function searchEmployees(
  employees: Employee[],
  query: string
): Employee[] {
  if (!query.trim()) {
    return employees;
  }

  const lowercaseQuery = query.toLowerCase();

  return employees.filter(
    employee =>
      employee.firstName.toLowerCase().includes(lowercaseQuery) ??
      employee.lastName.toLowerCase().includes(lowercaseQuery) ??
      employee.email?.toLowerCase().includes(lowercaseQuery) ??
      employee.position?.toLowerCase().includes(lowercaseQuery) ??
      employee.department?.toLowerCase().includes(lowercaseQuery)
  );
}

/**
 * Validates employee data before submission
 */
export function validateEmployeeData(data: Partial<Employee>): string[] {
  const errors: string[] = [];

  if (!data.firstName?.trim()) {
    errors.push("First name is required");
  }

  if (!data.lastName?.trim()) {
    errors.push("Last name is required");
  }

  if (!data.email?.trim()) {
    errors.push("Email is required");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Invalid email format");
  }

  if (data.hireDate && data.terminationDate) {
    const hire = new Date(data.hireDate);
    const termination = new Date(data.terminationDate);
    if (termination <= hire) {
      errors.push("Termination date must be after hire date");
    }
  }

  return errors;
}
