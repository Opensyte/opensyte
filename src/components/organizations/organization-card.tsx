"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  BuildingIcon,
  MoreHorizontal,
  PencilIcon,
  TrashIcon,
  Users,
  CalendarIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { EditOrganizationDialog } from "./edit-organization-dialog";
import { DeleteOrganizationDialog } from "./delete-organization-dialog";
import type { EditOrganizationFormValues } from "./edit-organization-dialog";
import { canManageRoles } from "~/lib/rbac";
import type { UserRole } from "@prisma/client";

type OrganizationProps = {
  id: string;
  name: string;
  description?: string | null;
  logo?: string | null;
  website?: string | null;
  industry?: string | null;
  membersCount: number;
  userRole?: UserRole;
  createdAt?: string;
  onEdit?: (id: string, data: EditOrganizationFormValues) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isEditLoading?: boolean;
  isDeleteLoading?: boolean;
};

export function OrganizationCard({
  id,
  name,
  description,
  logo,
  website,
  industry,
  membersCount,
  userRole = "VIEWER",
  createdAt,
  onEdit,
  onDelete,
  isEditLoading = false,
  isDeleteLoading = false,
}: OrganizationProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Format date if it exists
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const canEdit = canManageRoles(userRole);
  const canDelete = userRole === "ORGANIZATION_OWNER";

  const handleEdit = async (id: string, data: EditOrganizationFormValues) => {
    if (onEdit) {
      await onEdit(id, data);
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete(id);
    }
  };

  return (
    <>
      <Card className="hover:border-primary/30 group flex h-full flex-col gap-3 transition-all hover:shadow-md">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
                {logo ? (
                  <Image
                    src={logo}
                    alt={name}
                    width={36}
                    height={36}
                    className="rounded-md"
                  />
                ) : (
                  <BuildingIcon className="h-6 w-6" />
                )}
              </div>
              <div>
                <CardTitle className="truncate text-lg font-semibold">
                  {name}
                </CardTitle>
                <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
                  <Users className="h-3.5 w-3.5" />
                  <span>
                    {membersCount} {membersCount === 1 ? "member" : "members"}
                  </span>
                </div>
              </div>
            </div>
            {(canEdit || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 opacity-70 group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem
                      className="flex items-center gap-2"
                      onClick={() => setEditDialogOpen(true)}
                    >
                      <PencilIcon className="h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive flex items-center gap-2"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <CardDescription className="line-clamp-3 text-sm leading-relaxed">
            {description ?? "No description provided"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow space-y-4 pt-0">
          {industry && (
            <div className="text-muted-foreground text-sm">
              <span className="font-medium">Industry:</span> {industry}
            </div>
          )}

          {website && (
            <div className="text-muted-foreground text-sm">
              <span className="font-medium">Website:</span>{" "}
              <a
                href={
                  website.startsWith("http") ? website : `https://${website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {website}
              </a>
            </div>
          )}

          {formattedDate && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Created on {formattedDate}</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-muted/30 mt-auto border-t pt-4">
          <Link href={`/${id}`} className="w-full">
            <Button variant="default" className="w-full transition-colors">
              View Dashboard
            </Button>
          </Link>
        </CardFooter>
      </Card>

      <EditOrganizationDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleEdit}
        organization={{ id, name, description, website, industry }}
        isLoading={isEditLoading}
      />

      <DeleteOrganizationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        organizationName={name}
        isLoading={isDeleteLoading}
      />
    </>
  );
}
