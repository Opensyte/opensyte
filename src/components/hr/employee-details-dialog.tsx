"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  Mail,
  Phone,
  Building2,
  Calendar,
  MapPin,
  User,
  Shield,
  Clock,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { Employee } from "~/types";
import { employeeStatusColors, employeeStatusLabels } from "~/types/hr";
import { formatDistanceToNow } from "date-fns";

interface EmployeeDetailsDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeDetailsDialog({
  employee,
  open,
  onOpenChange,
}: EmployeeDetailsDialogProps) {
  if (!employee) return null;

  const formatDateShort = (dateString: Date | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {employee.firstName.charAt(0)}
                {employee.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-xl font-semibold">
                {employee.firstName} {employee.lastName}
              </div>
              <div className="text-muted-foreground text-sm font-normal">
                Employee ID: {employee.id.slice(-8)}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-muted-foreground text-sm font-medium">
                Basic Information
              </h3>

              {/* Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">Status</span>
                </div>
                <Badge
                  className={cn(
                    "px-2 py-0.5 font-medium",
                    employeeStatusColors[employee.status] ??
                      "bg-gray-100 text-gray-800"
                  )}
                >
                  {employeeStatusLabels[employee.status] ?? employee.status}
                </Badge>
              </div>

              {/* Position */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">Position</span>
                </div>
                <span className="text-sm">
                  {employee.position ?? "Not specified"}
                </span>
              </div>

              {/* Department */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">Department</span>
                </div>
                <span className="text-sm">
                  {employee.department ?? "Not specified"}
                </span>
              </div>

              {/* Manager */}
              {employee.managerId && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="text-muted-foreground h-4 w-4" />
                    <span className="text-sm">Manager</span>
                  </div>
                  <span className="text-sm">{employee.managerId}</span>
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div className="space-y-3">
              <h3 className="text-muted-foreground text-sm font-medium">
                Contact Information
              </h3>

              <div className="flex items-center gap-2">
                <Mail className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                <a
                  href={`mailto:${employee.email}`}
                  className="text-sm break-all hover:underline"
                >
                  {employee.email}
                </a>
              </div>

              {employee.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                  <a
                    href={`tel:${employee.phone}`}
                    className="text-sm break-all hover:underline"
                  >
                    {employee.phone}
                  </a>
                </div>
              )}
            </div>

            {/* Address */}
            {(employee.address ??
              employee.city ??
              employee.state ??
              employee.country) && (
              <div className="space-y-3">
                <h3 className="text-muted-foreground text-sm font-medium">
                  Address
                </h3>
                <div className="flex items-start gap-2">
                  <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div className="text-sm">
                    {employee.address && <p>{employee.address}</p>}
                    {(employee.city ??
                      employee.state ??
                      employee.postalCode) && (
                      <p>
                        {[employee.city, employee.state, employee.postalCode]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                    {employee.country && <p>{employee.country}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Employment Information */}
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-muted-foreground text-sm font-medium">
                Employment Information
              </h3>

              <div className="flex items-center gap-2">
                <Calendar className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-medium">Hire Date: </span>
                  {employee.hireDate ? (
                    <span>
                      {formatDateShort(employee.hireDate)}
                      <span className="text-muted-foreground ml-1">
                        (
                        {formatDistanceToNow(new Date(employee.hireDate), {
                          addSuffix: true,
                        })}
                        )
                      </span>
                    </span>
                  ) : (
                    "Not specified"
                  )}
                </div>
              </div>

              {employee.terminationDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium">Termination Date: </span>
                    {formatDateShort(employee.terminationDate)}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Clock className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-medium">Created: </span>
                  {formatDistanceToNow(new Date(employee.createdAt), {
                    addSuffix: true,
                  })}
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="space-y-3">
              <h3 className="text-muted-foreground text-sm font-medium">
                Personal Information
              </h3>

              {employee.birthDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Birth Date</span>
                  <span className="text-sm">
                    {formatDateShort(employee.birthDate)}
                  </span>
                </div>
              )}

              {employee.taxId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tax ID</span>
                  <span className="text-sm font-mono">{employee.taxId}</span>
                </div>
              )}
            </div>

            {/* Emergency Contact */}
            {(employee.emergencyContactName ??
              employee.emergencyContactPhone) && (
              <div className="space-y-3">
                <h3 className="text-muted-foreground text-sm font-medium">
                  Emergency Contact
                </h3>

                {employee.emergencyContactName && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Name</span>
                    <span className="text-sm">
                      {employee.emergencyContactName}
                    </span>
                  </div>
                )}

                {employee.emergencyContactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                    <a
                      href={`tel:${employee.emergencyContactPhone}`}
                      className="text-sm hover:underline"
                    >
                      {employee.emergencyContactPhone}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
