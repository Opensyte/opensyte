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
import { Separator } from "~/components/ui/separator";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Card, CardContent } from "~/components/ui/card";
import { formatDistanceToNow, format } from "date-fns";
import {
  Mail,
  Phone,
  Building2,
  Calendar,
  Copy,
  MapPin,
  Inbox,
  Handshake,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";
import type { Customer } from "@prisma/client";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import {
  leadStatusColors,
  leadStatusLabels,
  interactionTypeDotColors,
  interactionTypeLabels,
} from "~/types/crm";

interface ViewLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Customer;
}

const sourceIconMap = {
  WEBSITE: "🌐",
  REFERRAL: "👥",
  SOCIAL_MEDIA: "📱",
  EMAIL_CAMPAIGN: "📧",
  EVENT: "🎫",
  COLD_CALL: "📞",
  OTHER: "📌",
} as const;

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
      {children}
    </h3>
  );
}

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
    { id: lead?.id ?? "", organizationId: lead?.organizationId ?? "" },
    {
      enabled: !!lead?.id && isOpen,
    }
  );

  const leadData = detailedLead ?? lead;
  const interactions = detailedLead?.interactions ?? [];
  const deals = detailedLead?.deals ?? [];

  if (!lead) return null;

  const initials =
    `${leadData?.firstName?.[0] ?? ""}${leadData?.lastName?.[0] ?? ""}`.toUpperCase() ||
    "?";

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const formatCurrency = (value: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const address = [
    leadData?.address,
    leadData?.city,
    leadData?.state,
    leadData?.postalCode,
    leadData?.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-3xl">
        {/* Header */}
        <DialogHeader className="space-y-0 border-b p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <DialogTitle className="truncate text-xl">
                {isLoading && !leadData ? (
                  <Skeleton className="h-6 w-48" />
                ) : (
                  `${leadData?.firstName ?? ""} ${leadData?.lastName ?? ""}`.trim()
                )}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {leadData?.position && <span>{leadData.position}</span>}
                {leadData?.position && leadData?.company && <span>·</span>}
                {leadData?.company && <span>{leadData.company}</span>}
                {!leadData?.position && !leadData?.company && (
                  <span>Lead details</span>
                )}
              </DialogDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {leadData?.status && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "font-medium",
                      leadStatusColors[
                        leadData.status as keyof typeof leadStatusColors
                      ]
                    )}
                  >
                    {leadStatusLabels[
                      leadData.status as keyof typeof leadStatusLabels
                    ] ?? leadData.status}
                  </Badge>
                )}
                {leadData?.source && (
                  <Badge variant="outline" className="gap-1 font-normal">
                    <span>
                      {sourceIconMap[
                        leadData.source as keyof typeof sourceIconMap
                      ] ?? "📌"}
                    </span>
                    {leadData.source.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={!leadData?.email}
              asChild={!!leadData?.email}
            >
              {leadData?.email ? (
                <a href={`mailto:${leadData.email}`}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </a>
              ) : (
                <span className="flex flex-row items-center">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!leadData?.phone}
              asChild={!!leadData?.phone}
            >
              {leadData?.phone ? (
                <a href={`tel:${leadData.phone}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call
                </a>
              ) : (
                <span className="flex flex-row items-center">
                  <Phone className="mr-2 h-4 w-4" />
                  Call
                </span>
              )}
            </Button>
            {leadData?.email && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copy(leadData.email!, "Email")}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy email
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{leadData.email}</TooltipContent>
              </Tooltip>
            )}
            {leadData?.phone && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copy(leadData.phone!, "Phone")}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy phone
              </Button>
            )}
          </div>
        </DialogHeader>

        {error ? (
          <div className="p-6">
            <p className="text-destructive text-center text-sm">
              Error loading lead details: {error.message}
            </p>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full p-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">
                Timeline
                {interactions.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-5 px-1.5 tabular-nums"
                  >
                    {interactions.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="deals">
                Deals
                {deals.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-5 px-1.5 tabular-nums"
                  >
                    {deals.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="mt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="space-y-4 p-4">
                    <SectionLabel>Contact</SectionLabel>
                    {isLoading && !leadData ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {leadData?.email ? (
                          <div className="flex items-center justify-between gap-2">
                            <a
                              href={`mailto:${leadData.email}`}
                              className="flex min-w-0 items-center gap-2 text-sm hover:underline"
                            >
                              <Mail className="text-muted-foreground h-4 w-4 shrink-0" />
                              <span className="truncate">{leadData.email}</span>
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => copy(leadData.email!, "Email")}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : null}
                        {leadData?.phone ? (
                          <div className="flex items-center justify-between gap-2">
                            <a
                              href={`tel:${leadData.phone}`}
                              className="flex min-w-0 items-center gap-2 text-sm hover:underline"
                            >
                              <Phone className="text-muted-foreground h-4 w-4 shrink-0" />
                              <span className="truncate">{leadData.phone}</span>
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => copy(leadData.phone!, "Phone")}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : null}
                        {leadData?.company && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="text-muted-foreground h-4 w-4 shrink-0" />
                            <span className="truncate">{leadData.company}</span>
                          </div>
                        )}
                        {!leadData?.email &&
                          !leadData?.phone &&
                          !leadData?.company && (
                            <p className="text-muted-foreground text-sm">
                              No contact information
                            </p>
                          )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-4 p-4">
                    <SectionLabel>Location</SectionLabel>
                    {isLoading && !leadData ? (
                      <Skeleton className="h-4 w-full" />
                    ) : (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                        <span>{address || "No address information"}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardContent className="space-y-3 p-4">
                    <SectionLabel>Lead Information</SectionLabel>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="text-muted-foreground h-4 w-4 shrink-0" />
                      <span>
                        Created{" "}
                        {formatDistanceToNow(
                          new Date(leadData?.createdAt ?? new Date()),
                          { addSuffix: true }
                        )}
                      </span>
                    </div>
                    {leadData?.notes && (
                      <>
                        <Separator />
                        <div className="space-y-1.5">
                          <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                            <StickyNote className="h-3.5 w-3.5" />
                            Notes
                          </div>
                          <p className="text-sm whitespace-pre-line">
                            {leadData.notes}
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Timeline */}
            <TabsContent value="timeline" className="mt-4">
              {isLoading && !detailedLead ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : interactions.length === 0 ? (
                <EmptyState
                  icon={<Inbox className="text-muted-foreground h-6 w-6" />}
                  title="No interactions yet"
                  description="Calls, emails, and meetings logged for this lead will appear here."
                />
              ) : (
                <ScrollArea className="h-[320px] pr-3">
                  <ol className="relative space-y-5 border-l pl-6">
                    {interactions.map(interaction => (
                      <li key={interaction.id} className="relative">
                        <span
                          className={cn(
                            "absolute top-1 -left-[1.84rem] h-3 w-3 rounded-full ring-4 ring-background",
                            interactionTypeDotColors[
                              interaction.type as keyof typeof interactionTypeDotColors
                            ] ?? "bg-muted-foreground"
                          )}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge variant="outline" className="font-normal">
                            {interactionTypeLabels[
                              interaction.type as keyof typeof interactionTypeLabels
                            ] ?? interaction.type}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {format(
                              new Date(interaction.createdAt),
                              "MMM d, yyyy"
                            )}
                          </span>
                        </div>
                        {interaction.subject && (
                          <p className="mt-1 text-sm font-medium">
                            {interaction.subject}
                          </p>
                        )}
                        {interaction.content && (
                          <p className="text-muted-foreground mt-0.5 text-sm">
                            {interaction.content}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </ScrollArea>
              )}
            </TabsContent>

            {/* Deals */}
            <TabsContent value="deals" className="mt-4">
              {isLoading && !detailedLead ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : deals.length === 0 ? (
                <EmptyState
                  icon={<Handshake className="text-muted-foreground h-6 w-6" />}
                  title="No deals yet"
                  description="Deals created for this lead will show up here."
                />
              ) : (
                <div className="space-y-2">
                  {deals.map(deal => (
                    <div
                      key={deal.id}
                      className="hover:bg-muted/50 flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {deal.title}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatCurrency(
                            Number(deal.value),
                            deal.currency ?? "USD"
                          )}
                          {deal.probability !== null &&
                            deal.probability !== undefined &&
                            ` · ${deal.probability}%`}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "shrink-0 font-medium",
                          leadStatusColors[
                            deal.status as keyof typeof leadStatusColors
                          ]
                        )}
                      >
                        {leadStatusLabels[
                          deal.status as keyof typeof leadStatusLabels
                        ] ?? deal.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="border-t p-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
      <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
        {icon}
      </div>
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground max-w-xs text-sm">{description}</p>
    </div>
  );
}
