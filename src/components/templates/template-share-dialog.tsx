"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { format } from "date-fns";
import {
  Share,
  Copy,
  Mail,
  Link,
  Calendar as CalendarIcon,
  Users,
  Clock,
  Shield,
  ExternalLink,
  CheckCircle,
  Key,
  Settings,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "~/trpc/react";

const shareFormSchema = z.object({
  name: z.string().optional(),
  shareMode: z.enum(["LINK", "EMAIL", "MIXED"]).default("LINK"),
  expiresAt: z.date().optional(),
  maxUses: z.coerce.number().min(1).max(1000).optional(),
  notes: z.string().max(1000).optional(),
  recipientEmails: z.string().optional(),
});

type ShareFormValues = z.infer<typeof shareFormSchema>;

interface TemplateShareDialogProps {
  templatePackageId: string;
  organizationId: string;
  templateName: string;
  templateDescriptionHtml?: string | null; // raw HTML (sanitized upstream)
  variant?: "default" | "icon-only";
}

export function TemplateShareDialog({
  templatePackageId,
  organizationId,
  templateName,
  templateDescriptionHtml,
  variant = "default",
}: TemplateShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const form = useForm<ShareFormValues>({
    resolver: zodResolver(shareFormSchema),
    defaultValues: {
      shareMode: "LINK",
    },
  });

  const createShareMutation = api.templateSharing.createShare.useMutation({
    onSuccess: data => {
      // For EMAIL-only shares, shareUrl will be null, but we still want to show success
      if (data.shareUrl) {
        setShareUrl(data.shareUrl);
      } else {
        // For email-only shares, set a placeholder to trigger success state
        setShareUrl("email-only");
      }
      toast.success("Share created successfully!");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const onSubmit = (values: ShareFormValues) => {
    const recipientEmails = values.recipientEmails
      ? values.recipientEmails
          .split(",")
          .map(email => email.trim())
          .filter(email => email.length > 0)
      : undefined;

    createShareMutation.mutate({
      templatePackageId,
      organizationId,
      name: values.name,
      shareMode: values.shareMode,
      expiresAt: values.expiresAt,
      maxUses: values.maxUses,
      notes: values.notes,
      recipientEmails,
    });
  };

  const copyToClipboard = () => {
    if (shareUrl && shareUrl !== "email-only") {
      const fullUrl = getFullShareUrl();
      void navigator.clipboard.writeText(fullUrl);
      toast.success("Share URL copied to clipboard!");
    }
  };

  const getFullShareUrl = () => {
    if (!shareUrl || shareUrl === "email-only") return "";
    if (typeof window !== "undefined") {
      const { protocol, host } = window.location;
      const token = shareUrl.split("/").pop();
      return `${protocol}//${host}/shared/templates/${token}`;
    }
    return shareUrl;
  };

  const isEmailOnlyShare = shareUrl === "email-only";

  const handleClose = () => {
    setIsOpen(false);
    setShareUrl(null);
    form.reset();
  };

  // Success state UI
  if (shareUrl) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {variant === "icon-only" ? (
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm">
              <Share className="mr-2 h-4 w-4" />
              Share Template
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto mx-auto md:mx-4">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-2xl">
              Share Created Successfully!
            </DialogTitle>
            <DialogDescription className="text-base">
              Your template &quot;{templateName}&quot; is now ready to share
              with others.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {!isEmailOnlyShare && (
              <div className="rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:from-blue-950 dark:to-indigo-950">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                      <Link className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                        Share URL
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Copy and share this link
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="border-blue-200 bg-white/50 hover:bg-white dark:border-blue-800 dark:bg-blue-950/50"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <div className="rounded-md border bg-white p-3 font-mono text-sm dark:bg-gray-950">
                  <div className="break-all text-gray-700 dark:text-gray-300">
                    {getFullShareUrl()}
                  </div>
                </div>
              </div>
            )}

            {isEmailOnlyShare && (
              <div className="rounded-lg border bg-gradient-to-r from-green-50 to-emerald-50 p-6 dark:from-green-950 dark:to-emerald-950">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                    <Mail className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-900 dark:text-green-100">
                      Email Invitations Sent
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your invitations have been sent to the specified
                      recipients
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <Shield className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium">Secure</div>
                  <div className="text-xs text-muted-foreground">
                    Encrypted link
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-sm font-medium">Trackable</div>
                  <div className="text-xs text-muted-foreground">
                    Usage analytics
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <ExternalLink className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="text-sm font-medium">Ready</div>
                  <div className="text-xs text-muted-foreground">
                    Share instantly
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
              <h4 className="mb-2 font-medium">What happens next?</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Recipients can preview the template package details</li>
                <li>• They can import it into their organization</li>
                <li>
                  • You&apos;ll be able to track usage and manage the share
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
            {!isEmailOnlyShare && (
              <Button onClick={copyToClipboard} className="w-full sm:w-auto">
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Form state UI
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {variant === "icon-only" ? (
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Share className="mr-2 h-4 w-4" />
            Share Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-7xl max-h-[95vh] min-w-fit overflow-y-auto mx-auto md:mx-4">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Share className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                Share Template Package
              </DialogTitle>
              <DialogDescription>
                Share &quot;{templateName}&quot; with other organizations
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {templateDescriptionHtml && (
          <div
            className="mb-6 rounded-lg border bg-muted/30 p-4 text-left text-sm leading-relaxed max-w-none [&_*]:text-left [&>h1]:text-2xl [&>h1]:font-bold [&>h2]:text-xl [&>h2]:font-semibold [&>h3]:text-lg [&>h3]:font-medium [&>p]:mb-3 [&>ul]:list-disc [&>ul]:ml-6 [&>ol]:list-decimal [&>ol]:ml-6 [&>li]:mb-1.5 [&>strong]:font-semibold [&>a]:text-blue-600 [&>a]:underline hover:[&>a]:text-blue-800 [&>blockquote]:border-l-4 [&>blockquote]:border-border [&>blockquote]:pl-4 [&>blockquote]:italic [&>code]:rounded [&>code]:bg-muted [&>code]:px-1.5 [&>code]:py-0.5 [&>pre]:bg-muted [&>pre]:p-3 [&>pre]:rounded [&>pre]:overflow-x-auto [&>table]:w-full [&>table]:text-left [&>th]:font-semibold"
            dangerouslySetInnerHTML={{ __html: templateDescriptionHtml }}
          />
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Share Method Section */}
            <div className="rounded-lg border p-6">
              <div className="mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Share Settings</h3>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <FormField
                  control={form.control}
                  name="shareMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Share Method
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select sharing method">
                              {field.value === "LINK" && "Public Link"}
                              {field.value === "EMAIL" && "Email Invitations"}
                              {field.value === "MIXED" && "Link + Email"}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LINK">
                            <div className="flex items-center gap-3 py-2">
                              <Link className="h-4 w-4 text-blue-600" />
                              <div>
                                <div className="font-medium">Public Link</div>
                                <div className="text-sm text-muted-foreground">
                                  Anyone with the link can access
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="EMAIL">
                            <div className="flex items-center gap-3 py-2">
                              <Mail className="h-4 w-4 text-green-600" />
                              <div>
                                <div className="font-medium">
                                  Email Invitations
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Invite specific people via email
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="MIXED">
                            <div className="flex items-center gap-3 py-2">
                              <Users className="h-4 w-4 text-purple-600" />
                              <div>
                                <div className="font-medium">Link + Email</div>
                                <div className="text-sm text-muted-foreground">
                                  Both sharing methods
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Share Name (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., CRM Template v2.1"
                          className="h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this share
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Access Control Section */}
            <div className="rounded-lg border p-6">
              <div className="mb-4 flex items-center gap-2">
                <Key className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold">Access Control</h3>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-base font-medium">
                        Expiration Date (Optional)
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "h-12 pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={date =>
                              date < new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When this share should expire
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxUses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Usage Limit (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Unlimited"
                          min="1"
                          max="1000"
                          className="h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of imports allowed
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Email Recipients Section */}
            {(form.watch("shareMode") === "EMAIL" ||
              form.watch("shareMode") === "MIXED") && (
              <div className="rounded-lg border p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Email Recipients</h3>
                </div>

                <FormField
                  control={form.control}
                  name="recipientEmails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Email Addresses
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="john@example.com, jane@company.com"
                          className="min-h-[100px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter email addresses separated by commas. These people
                        will receive an invitation to view the template.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Notes Section */}
            <div className="rounded-lg border p-6">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Notes (Optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional information about this template package..."
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Internal notes about this share (not visible to
                      recipients)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createShareMutation.isPending}
                className="w-full sm:w-auto"
                size="lg"
              >
                {createShareMutation.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-current" />
                    Creating Share...
                  </>
                ) : (
                  <>
                    <Share className="mr-2 h-4 w-4" />
                    Create Share
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
