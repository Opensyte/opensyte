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
import { Mail, Phone, Building2, Calendar, Tag, Info } from "lucide-react";
import type { Customer } from "~/types/crm";
import { api } from "~/trpc/react";

interface ViewLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Customer;
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

export default function ViewLeadDialog({
  isOpen,
  onClose,
  lead,
}: ViewLeadDialogProps) {
  // Fetch detailed lead information using tRPC
  const {
    data: detailedLead,
    isLoading,
    error,
  } = api.contactsCrm.getContactById.useQuery(
    { id: lead?.id ?? "" },
    {
      enabled: !!lead?.id && isOpen,
    }
  );

  const leadData = detailedLead ?? lead;

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isLoading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              `${leadData?.firstName} ${leadData?.lastName}`
            )}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <>
                {leadData?.position && (
                  <span className="text-muted-foreground text-sm">
                    {leadData.position}
                  </span>
                )}
                {leadData?.company && (
                  <>
                    {leadData.position && <span>•</span>}
                    <span className="text-muted-foreground text-sm">
                      {leadData.company}
                    </span>
                  </>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="py-8 text-center">
            <p className="text-red-600">
              Error loading lead details: {error.message}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-muted-foreground text-sm font-medium">
                  Contact Information
                </h3>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ) : (
                  <>
                    {leadData?.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="text-muted-foreground h-4 w-4" />
                        <a
                          href={`mailto:${leadData.email}`}
                          className="text-sm hover:underline"
                        >
                          {leadData.email}
                        </a>
                      </div>
                    )}
                    {leadData?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="text-muted-foreground h-4 w-4" />
                        <a
                          href={`tel:${leadData.phone}`}
                          className="text-sm hover:underline"
                        >
                          {leadData.phone}
                        </a>
                      </div>
                    )}
                    {leadData?.company && (
                      <div className="flex items-center gap-2">
                        <Building2 className="text-muted-foreground h-4 w-4" />
                        <span className="text-sm">{leadData.company}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-muted-foreground text-sm font-medium">
                  Location
                </h3>
                {isLoading ? (
                  <Skeleton className="h-4 w-full" />
                ) : (
                  <div className="text-sm">
                    {[
                      leadData?.address,
                      leadData?.city,
                      leadData?.state,
                      leadData?.postalCode,
                      leadData?.country,
                    ]
                      .filter(Boolean)
                      .join(", ") || "No address information"}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-muted-foreground text-sm font-medium">
                  Lead Information
                </h3>

                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Calendar className="text-muted-foreground h-4 w-4" />
                      <span className="text-sm">
                        Created{" "}
                        {formatDistanceToNow(
                          new Date(leadData?.createdAt ?? new Date()),
                          {
                            addSuffix: true,
                          }
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Tag className="text-muted-foreground h-4 w-4" />
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Status:</span>
                        <Badge
                          variant="secondary"
                          className={
                            leadData?.status &&
                            leadData.status in statusColorMap
                              ? statusColorMap[
                                  leadData.status as keyof typeof statusColorMap
                                ]
                              : undefined
                          }
                        >
                          {leadData?.status?.replace(/_/g, " ") ?? "N/A"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Info className="text-muted-foreground h-4 w-4" />
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Source:</span>
                        <span className="flex items-center text-sm">
                          {leadData?.source ? (
                            <>
                              <span className="mr-1">
                                {leadData.source &&
                                leadData.source in sourceIconMap
                                  ? sourceIconMap[
                                      leadData.source as keyof typeof sourceIconMap
                                    ]
                                  : "📌"}
                              </span>
                              {leadData.source.replace(/_/g, " ")}
                            </>
                          ) : (
                            "N/A"
                          )}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {(leadData?.notes ?? isLoading) && (
                <div className="space-y-2">
                  <h3 className="text-muted-foreground text-sm font-medium">
                    Notes
                  </h3>
                  {isLoading ? (
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-line">
                      {leadData?.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
