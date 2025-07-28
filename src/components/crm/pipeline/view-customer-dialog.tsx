"use client";

import {
  CalendarIcon,
  Phone,
  Mail,
  MapPin,
  User2,
  Building,
} from "lucide-react";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import { api } from "~/trpc/react";

interface ViewCustomerDialogProps {
  customerName: string;
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Customer details will be fetched via tRPC

export function ViewCustomerDialog({
  customerId,
  open,
  onOpenChange,
}: ViewCustomerDialogProps) {
  // Use tRPC to fetch customer details
  const {
    data: customer,
    isLoading,
    error,
  } = api.contactsCrm.getContactById.useQuery(
    { id: customerId },
    {
      enabled: open && !!customerId, // Only fetch when dialog is open and customerId exists
      refetchOnWindowFocus: false,
    },
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const CustomerSkeleton = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold">
            Customer Details
          </DialogTitle>
        </DialogHeader>

        {isLoading && <CustomerSkeleton />}

        {error && (
          <div className="flex h-32 items-center justify-center">
            <div className="text-center">
              <p className="text-destructive font-medium">
                Failed to load customer details
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {error.message}
              </p>
            </div>
          </div>
        )}

        {customer && !isLoading && (
          <div className="space-y-6">
            {/* Header Section with improved styling */}
            <div className="flex items-start gap-6 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:from-blue-950/20 dark:to-indigo-950/20">
              <Avatar className="h-20 w-20 border-4 border-white shadow-lg dark:border-gray-800">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-bold text-white">
                  {getInitials(`${customer.firstName} ${customer.lastName}`)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {customer.firstName} {customer.lastName}
                </h3>
                <div className="text-muted-foreground mt-2 flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  <span className="text-lg font-medium">
                    {customer.company}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                  >
                    {customer.status}
                  </Badge>
                  {customer.position && (
                    <Badge variant="secondary">{customer.position}</Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="rounded-full bg-green-500 p-2">
                      <Mail className="h-4 w-4 text-white" />
                    </div>
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {customer.email && (
                      <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                        <Mail className="text-muted-foreground h-5 w-5" />
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Email
                          </p>
                          <a
                            href={`mailto:${customer.email}`}
                            className="text-primary font-medium hover:underline"
                          >
                            {customer.email}
                          </a>
                        </div>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                        <Phone className="text-muted-foreground h-5 w-5" />
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Phone
                          </p>
                          <a
                            href={`tel:${customer.phone}`}
                            className="text-primary font-medium hover:underline"
                          >
                            {customer.phone}
                          </a>
                        </div>
                      </div>
                    )}
                    {customer.position && (
                      <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                        <User2 className="text-muted-foreground h-5 w-5" />
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Position
                          </p>
                          <p className="font-medium">{customer.position}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="rounded-full bg-blue-500 p-2">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    Address Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {customer.address ? (
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                      <div className="flex items-start gap-3">
                        <MapPin className="text-muted-foreground mt-1 h-5 w-5" />
                        <div className="space-y-1">
                          <p className="font-medium">{customer.address}</p>
                          <p className="text-muted-foreground">
                            {customer.city}, {customer.state}{" "}
                            {customer.postalCode}
                          </p>
                          <p className="text-muted-foreground">
                            {customer.country}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground flex h-20 items-center justify-center text-center">
                      <p>No address information available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="rounded-full bg-purple-500 p-2">
                    <User2 className="h-4 w-4 text-white" />
                  </div>
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                      <span className="text-muted-foreground mb-2 block text-sm font-medium">
                        Source
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-white dark:bg-gray-700"
                      >
                        {customer.source?.replace(/_/g, " ") ?? "Unknown"}
                      </Badge>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                      <span className="text-muted-foreground mb-2 block text-sm font-medium">
                        Created
                      </span>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">
                          {format(customer.createdAt, "PPP")}
                        </span>
                      </div>
                    </div>
                  </div>
                  {customer.notes && (
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                      <span className="text-muted-foreground mb-2 block text-sm font-medium">
                        Notes
                      </span>
                      <p className="text-sm leading-relaxed">
                        {customer.notes}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
