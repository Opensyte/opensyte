"use client";
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Avatar } from "~/components/ui/avatar";
import {
  Eye,
  MoreHorizontal,
  Pencil,
  Phone,
  Mail,
  MessageSquare,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Badge } from "~/components/ui/badge";
import InteractionDialog from "./interaction-dialog";
import type { InteractionData } from "./interaction-dialog";
import type { Interaction } from "./interaction-history";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

const dummyLeads = [
  {
    id: "1",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    company: "Acme Inc.",
    position: "CTO",
    status: "NEW",
    source: "WEBSITE",
    createdAt: "2023-05-12T10:30:00Z",
  },
  {
    id: "2",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@example.com",
    phone: "+1 (555) 987-6543",
    company: "XYZ Corp",
    position: "Marketing Director",
    status: "CONTACTED",
    source: "REFERRAL",
    createdAt: "2023-05-10T14:45:00Z",
  },
  {
    id: "3",
    firstName: "Michael",
    lastName: "Johnson",
    email: "michael.johnson@example.com",
    phone: "+1 (555) 456-7890",
    company: "Tech Solutions",
    position: "CEO",
    status: "QUALIFIED",
    source: "EMAIL_CAMPAIGN",
    createdAt: "2023-05-08T09:15:00Z",
  },
];

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

export default function LeadManagementTable() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isInteractionDialogOpen, setIsInteractionDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const handleOpenInteractionDialog = (
    leadId: string,
    firstName: string,
    lastName: string,
  ) => {
    setSelectedLead({
      id: leadId,
      name: `${firstName} ${lastName}`,
    });
    setIsInteractionDialogOpen(true);
  };

  const handleCloseInteractionDialog = () => {
    setIsInteractionDialogOpen(false);
    setSelectedLead(null);
  };

  const handleSaveInteraction = (data: InteractionData) => {
    const newInteraction: Interaction = {
      id: uuidv4(),
      ...data,
    };

    // In a real application, you would send this to your API
    // For now, we'll just add it to our local state
    setInteractions((prev) => [...prev, newInteraction]);
    setIsInteractionDialogOpen(false);

    // Show success toast using Sonner
    toast.success("Interaction logged", {
      description: `${data.type.charAt(0) + data.type.slice(1).toLowerCase()} with ${selectedLead?.name} has been recorded.`,
    });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dummyLeads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell>
                <Checkbox />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <div className="bg-muted flex h-full w-full items-center justify-center">
                      {lead.firstName.charAt(0)}
                      {lead.lastName.charAt(0)}
                    </div>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {lead.firstName} {lead.lastName}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {lead.position}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center text-sm">
                    <Mail className="text-muted-foreground mr-1 h-4 w-4" />
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-sm hover:underline"
                    >
                      {lead.email}
                    </a>
                  </div>
                  <div className="flex items-center text-sm">
                    <Phone className="text-muted-foreground mr-1 h-4 w-4" />
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-sm hover:underline"
                    >
                      {lead.phone}
                    </a>
                  </div>
                </div>
              </TableCell>
              <TableCell>{lead.company}</TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={
                    statusColorMap[lead.status as keyof typeof statusColorMap]
                  }
                >
                  {lead.status.replace(/_/g, " ")}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <span className="mr-1">
                    {sourceIconMap[lead.source as keyof typeof sourceIconMap]}
                  </span>
                  <span>{lead.source.replace(/_/g, " ")}</span>
                </div>
              </TableCell>
              <TableCell>{formatDate(lead.createdAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleOpenInteractionDialog(
                            lead.id,
                            lead.firstName,
                            lead.lastName,
                          )
                        }
                      >
                        <MessageSquare className="mr-2 h-4 w-4" /> Log
                        Interaction
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedLead && (
        <InteractionDialog
          isOpen={isInteractionDialogOpen}
          leadId={selectedLead.id}
          leadName={selectedLead.name}
          onClose={handleCloseInteractionDialog}
          onSave={handleSaveInteraction}
        />
      )}
    </div>
  );
}
