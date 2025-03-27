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
import { formatDistanceToNow } from "date-fns";
import { Mail, Phone, Building2, Calendar, Tag, Info } from "lucide-react";
import type { Customer } from "~/types/crm";

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
  if (!lead) return null;

  const formatDate = (dateString: string | Date) => {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {lead.firstName} {lead.lastName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {lead.position && (
              <span className="text-muted-foreground text-sm">
                {lead.position}
              </span>
            )}
            {lead.company && (
              <>
                <span>•</span>
                <span className="text-muted-foreground text-sm">
                  {lead.company}
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-sm font-medium">
                Contact Information
              </h3>
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="text-muted-foreground h-4 w-4" />
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-sm hover:underline"
                  >
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="text-muted-foreground h-4 w-4" />
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-sm hover:underline"
                  >
                    {lead.phone}
                  </a>
                </div>
              )}
              {lead.company && (
                <div className="flex items-center gap-2">
                  <Building2 className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">{lead.company}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-muted-foreground text-sm font-medium">
                Location
              </h3>
              <div className="text-sm">
                {[
                  lead.address,
                  lead.city,
                  lead.state,
                  lead.postalCode,
                  lead.country,
                ]
                  .filter(Boolean)
                  .join(", ") || "No address information"}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-sm font-medium">
                Lead Information
              </h3>

              <div className="flex items-center gap-2">
                <Calendar className="text-muted-foreground h-4 w-4" />
                <span className="text-sm">
                  Created{" "}
                  {formatDistanceToNow(new Date(lead.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Tag className="text-muted-foreground h-4 w-4" />
                <div className="flex items-center gap-2">
                  <span className="text-sm">Status:</span>
                  <Badge
                    variant="secondary"
                    className={
                      lead.status &&
                      statusColorMap[lead.status as keyof typeof statusColorMap]
                    }
                  >
                    {lead.status?.replace(/_/g, " ") || "N/A"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Info className="text-muted-foreground h-4 w-4" />
                <div className="flex items-center gap-2">
                  <span className="text-sm">Source:</span>
                  <span className="flex items-center text-sm">
                    {lead.source && (
                      <>
                        <span className="mr-1">
                          {
                            sourceIconMap[
                              lead.source as keyof typeof sourceIconMap
                            ]
                          }
                        </span>
                        {lead.source.replace(/_/g, " ")}
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {lead.notes && (
              <div className="space-y-2">
                <h3 className="text-muted-foreground text-sm font-medium">
                  Notes
                </h3>
                <p className="text-sm whitespace-pre-line">{lead.notes}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
