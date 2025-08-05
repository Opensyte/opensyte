"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Plus, Users, UserCheck, UserX, Clock } from "lucide-react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import type { Employee } from "~/types";
import { Skeleton } from "~/components/ui/skeleton";
import { EmployeeFilters } from "./employee-filters";
import { EmployeesTable } from "./employees-table";
import {
  AddEmployeeDialog,
  type AddEmployeeFormValues,
} from "./add-employee-dialog";
import {
  EditEmployeeDialog,
  type EditEmployeeFormValues,
} from "./edit-employee-dialog";

export function EmployeesClient() {
  const params = useParams();
  const orgId = params.orgId as string;

  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );

  // API calls
  const utils = api.useUtils();

  const {
    data: employees = [],
    isLoading,
    error,
  } = api.hr.getEmployeesByOrganization.useQuery(
    { organizationId: orgId },
    {
      refetchOnWindowFocus: false,
      enabled: !!orgId,
    }
  );

  const { data: stats, isLoading: isStatsLoading } =
    api.hr.getEmployeeStats.useQuery(
      { organizationId: orgId },
      {
        refetchOnWindowFocus: false,
        enabled: !!orgId,
      }
    );

  const createEmployeeMutation = api.hr.createEmployee.useMutation({
    onSuccess: () => {
      void utils.hr.getEmployeesByOrganization.invalidate();
      void utils.hr.getEmployeeStats.invalidate();
      toast.success("Employee added successfully!");
      setAddDialogOpen(false);
    },
    onError: error => {
      toast.error(error.message || "Failed to add employee");
    },
  });

  const updateEmployeeMutation = api.hr.updateEmployee.useMutation({
    onSuccess: () => {
      void utils.hr.getEmployeesByOrganization.invalidate();
      void utils.hr.getEmployeeStats.invalidate();
      toast.success("Employee updated successfully!");
      setEditDialogOpen(false);
      setSelectedEmployee(null);
    },
    onError: error => {
      toast.error(error.message || "Failed to update employee");
    },
  });

  const deleteEmployeeMutation = api.hr.deleteEmployee.useMutation({
    onSuccess: () => {
      void utils.hr.getEmployeesByOrganization.invalidate();
      void utils.hr.getEmployeeStats.invalidate();
      toast.success("Employee deleted successfully!");
    },
    onError: error => {
      toast.error(error.message || "Failed to delete employee");
    },
  });

  // Filter employees based on search and filters
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];

    return employees.filter(employee => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        employee.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (employee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ??
          false) ||
        (employee.position?.toLowerCase().includes(searchQuery.toLowerCase()) ??
          false) ||
        (employee.department
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ??
          false);

      // Status filter
      const matchesStatus =
        statusFilter === "all" || employee.status === statusFilter;

      // Department filter
      const matchesDepartment =
        departmentFilter === "all" || employee.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [employees, searchQuery, statusFilter, departmentFilter]);

  const handleAddEmployee = async (data: AddEmployeeFormValues) => {
    await createEmployeeMutation.mutateAsync({
      ...data,
      organizationId: orgId,
    });
  };

  const handleEditEmployee = async (
    id: string,
    data: EditEmployeeFormValues
  ) => {
    await updateEmployeeMutation.mutateAsync({
      id,
      ...data,
    });
  };

  const handleDeleteEmployee = async (id: string) => {
    await deleteEmployeeMutation.mutateAsync({ id });
  };

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditDialogOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-16" />
                <Skeleton className="mt-1 h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
              <div className="rounded-md border">
                <div className="space-y-4 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              HR - Employees
            </h1>
            <p className="text-muted-foreground">
              Manage your organization&apos;s employee database
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="py-8 text-center">
              <p className="text-red-600">
                Error loading employees: {error.message}
              </p>
              <Button
                onClick={() =>
                  void utils.hr.getEmployeesByOrganization.invalidate()
                }
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HR - Employees</h1>
          <p className="text-muted-foreground">
            Manage your organization&apos;s employee database
          </p>
        </div>
        <Button
          onClick={() => setAddDialogOpen(true)}
          disabled={createEmployeeMutation.isPending}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Statistics Cards */}
      {!isStatsLoading && stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Employees
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                All employees in organization
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.activeEmployees}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently active employees
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Leave</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.onLeaveEmployees}
              </div>
              <p className="text-xs text-muted-foreground">
                Employees on leave
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Probation</CardTitle>
              <UserX className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.probationEmployees}
              </div>
              <p className="text-xs text-muted-foreground">
                Employees on probation
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Management</CardTitle>
          <CardDescription>
            View and manage all employees in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            departmentFilter={departmentFilter}
            onDepartmentChange={setDepartmentFilter}
            employees={employees}
          />

          <EmployeesTable
            employees={filteredEmployees}
            onEditEmployee={openEditDialog}
            onDeleteEmployee={handleDeleteEmployee}
            isDeleting={deleteEmployeeMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddEmployeeDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSave={handleAddEmployee}
        isLoading={createEmployeeMutation.isPending}
      />

      <EditEmployeeDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleEditEmployee}
        employee={selectedEmployee}
        isLoading={updateEmployeeMutation.isPending}
      />
    </div>
  );
}
