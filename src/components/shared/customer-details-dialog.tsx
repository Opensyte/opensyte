"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import {
  Mail,
  Phone,
  Building2,
  Calendar,
  Tag,
  Info,
  MapPin,
  User2,
} from "lucide-react";
import type { Customer } from "~/types/crm";
import { api } from "~/trpc/react";

interface CustomerDetailsDialogProps {
  customerName: string;
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColorMap = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-purple-100 text-purple-800",
  QUALIFIED: "bg-green-100 text-green-800",
  PROPOSAL: "bg-yellow-100 text-yellow-800",
  NEGOTIATION: "bg-orange-100 text-orange-800",
  CLOSED_WON: "bg-green-100 text-green-800",
  CLOSED_LOST: "bg-red-100 text-red-800",
};

const sourceIconMap = {
  WEBSITE: "🌐",
  REFERRAL: "👥",
  SOCIAL_MEDIA: "📱",
  EMAIL_CAMPAIGN: "📧",
  EVENT: "🎫",
  COLD_CALL: "📞",
  OTHER: "📌",
};

export function CustomerDetailsDialog({
  customerName,
  customerId,
  open,
  onOpenChange,
}: CustomerDetailsDialogProps) {
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

  const CustomerSkeleton = () => (
    <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isLoading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              `${customer?.firstName} ${customer?.lastName}`
            )}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <>
                {customer?.position && (
                  <span className="text-muted-foreground text-sm">
                    {customer.position}
                  </span>
                )}
                {customer?.company && (
                  <>
                    {customer.position && <span>•</span>}
                    <span className="text-muted-foreground text-sm">
                      {customer.company}
                    </span>
                  </>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading && <CustomerSkeleton />}

        {error && (
          <div className="py-8 text-center">
            <p className="text-red-600">
              Error loading customer details: {error.message}
            </p>
          </div>
        )}

        {customer && !isLoading && (
          <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-muted-foreground text-sm font-medium">
                  Contact Information
                </h3>
                <>
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                      <a
                        href={`mailto:${customer.email}`}
                        className="text-sm break-all hover:underline"
                      >
                        {customer.email}
                      </a>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                      <a
                        href={`tel:${customer.phone}`}
                        className="text-sm break-all hover:underline"
                      >
                        {customer.phone}
                      </a>
                    </div>
                  )}
                  {customer.company && (
                    <div className="flex items-center gap-2">
                      <Building2 className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                      <span className="text-sm break-words">
                        {customer.company}
                      </span>
                    </div>
                  )}
                  {customer.position && (
                    <div className="flex items-center gap-2">
                      <User2 className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                      <span className="text-sm break-words">
                        {customer.position}
                      </span>
                    </div>
                  )}
                </>
              </div>

              {customer.address && (
                <div className="space-y-2">
                  <h3 className="text-muted-foreground text-sm font-medium">
                    Address
                  </h3>
                  <div className="flex items-start gap-2">
                    <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div className="text-sm break-words">
                      <p>{customer.address}</p>
                      {(customer.city ??
                        customer.state ??
                        customer.postalCode) && (
                        <p>
                          {[customer.city, customer.state, customer.postalCode]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                      {customer.country && <p>{customer.country}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-muted-foreground text-sm font-medium">
                  Lead Information
                </h3>
                <>
                  <div className="flex items-center gap-2">
                    <Calendar className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">
                      Created{" "}
                      {formatDistanceToNow(new Date(customer.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Tag className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Status:</span>
                      <Badge
                        variant="secondary"
                        className={
                          customer.status && customer.status in statusColorMap
                            ? statusColorMap[
                                customer.status as keyof typeof statusColorMap
                              ]
                            : undefined
                        }
                      >
                        {customer.status?.replace(/_/g, " ") ?? "N/A"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Info className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Source:</span>
                      <span className="flex items-center text-sm">
                        {customer.source ? (
                          <>
                            <span className="mr-1">
                              {customer.source &&
                              customer.source in sourceIconMap
                                ? sourceIconMap[
                                    customer.source as keyof typeof sourceIconMap
                                  ]
                                : "📌"}
                            </span>
                            <span className="break-words">
                              {customer.source.replace(/_/g, " ")}
                            </span>
                          </>
                        ) : (
                          "N/A"
                        )}
                      </span>
                    </div>
                  </div>
                </>
              </div>

              {customer.notes && (
                <div className="space-y-2">
                  <h3 className="text-muted-foreground text-sm font-medium">
                    Notes
                  </h3>
                  <p className="text-sm break-words whitespace-pre-line">
                    {customer.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-0">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
