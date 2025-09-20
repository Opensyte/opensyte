"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { api } from "~/trpc/react";
import { authClient } from "~/lib/auth-client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Save, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { UploadThingImageUpload } from "~/components/ui/uploadthing-image-upload";

const organizationFormSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  industry: z
    .string()
    .max(100, "Industry must be less than 100 characters")
    .optional(),
  address: z
    .string()
    .max(500, "Address must be less than 500 characters")
    .optional(),
  logo: z.string().optional(),
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

interface OrganizationInfoFormProps {
  organization: {
    id: string;
    name: string;
    description?: string | null;
    website?: string | null;
    industry?: string | null;
    address?: string | null;
    logo?: string | null;
  };
  canEdit: boolean;
}

export function OrganizationInfoForm({
  organization,
  canEdit,
}: OrganizationInfoFormProps) {
  const { data: session } = authClient.useSession();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: organization.name,
      description: organization.description ?? "",
      website: organization.website ?? "",
      industry: organization.industry ?? "",
      address: organization.address ?? "",
      logo: organization.logo ?? "",
    },
  });

  const { mutate: updateOrganization, isPending } =
    api.organization.update.useMutation({
      onSuccess: () => {
        toast.success("Organization updated successfully");
        setIsEditing(false);
      },
      onError: error => {
        toast.error(`Failed to update organization: ${error.message}`);
      },
    });

  const onSubmit = (data: OrganizationFormValues) => {
    if (!session?.user?.id) {
      toast.error("You must be logged in to update organization");
      return;
    }

    updateOrganization({
      id: organization.id,
      userId: session.user.id,
      ...data,
    });
  };

  const onCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  const isDirty = form.formState.isDirty;

  if (!canEdit && !isEditing) {
    return (
      <div className="space-y-6">
        {/* Read-only View */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Organization Name</label>
            <div className="flex items-center gap-2">
              <p className="text-sm text-foreground">{organization.name}</p>
              <Badge variant="secondary" className="text-xs">
                Required
              </Badge>
            </div>
          </div>

          {organization.logo && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Logo</label>
              <div className="w-16 h-16 rounded-lg overflow-hidden border bg-muted">
                <Image
                  src={organization.logo}
                  alt={`${organization.name} logo`}
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
          )}

          {organization.description && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {organization.description}
              </p>
            </div>
          )}

          {organization.industry && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Industry</label>
              <p className="text-sm text-muted-foreground">
                {organization.industry}
              </p>
            </div>
          )}

          {organization.website && (
            <div className="flex flex-col">
              <label className="text-sm font-medium">Website</label>
              <a
                href={organization.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground"
              >
                {organization.website}
              </a>
            </div>
          )}

          {organization.address && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {organization.address}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50 border">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to edit organization settings.
            Contact an administrator to make changes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            {/* Organization Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Organization Name
                    <Badge variant="secondary" className="text-xs">
                      Required
                    </Badge>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter organization name"
                      disabled={!isEditing || isPending}
                      className={!isEditing ? "bg-muted/50" : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Logo Upload */}
            <FormField
              control={form.control}
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <UploadThingImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      disabled={!isEditing || isPending}
                      label="Organization Logo"
                      description="Upload a logo to represent your organization (optional)"
                      endpoint="documentUpload"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Brief description of your organization (optional)"
                      disabled={!isEditing || isPending}
                      className={`min-h-[100px] resize-none ${!isEditing ? "bg-muted/50" : ""}`}
                      maxLength={500}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length ?? 0}/500 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Industry */}
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Technology, Healthcare"
                        disabled={!isEditing || isPending}
                        className={!isEditing ? "bg-muted/50" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Website */}
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://example.com"
                        disabled={!isEditing || isPending}
                        className={!isEditing ? "bg-muted/50" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter organization address (optional)"
                      disabled={!isEditing || isPending}
                      className={`min-h-[80px] resize-none ${!isEditing ? "bg-muted/50" : ""}`}
                      maxLength={500}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length ?? 0}/500 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {isEditing && (
            <>
              <Separator />

              {/* Form Actions */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  {isDirty ? "You have unsaved changes" : "No changes made"}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isDirty || isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </form>
      </Form>

      {/* Edit Toggle */}
      {!isEditing && canEdit && (
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Click edit to modify organization information
          </p>
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2"
          >
            Edit Information
          </Button>
        </div>
      )}
    </div>
  );
}
