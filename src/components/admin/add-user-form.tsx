"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";

const addUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type AddUserFormData = z.infer<typeof addUserSchema>;

export function AddUserForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddUserFormData>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      email: "",
    },
  });

  const utils = api.useUtils();

  const addUserMutation = api.admin.addEarlyAccessUser.useMutation({
    onSuccess: data => {
      toast.success(data.message);
      form.reset();
      setIsSubmitting(false);
      // Refetch the early access codes list
      void utils.admin.getEarlyAccessCodes.invalidate();
    },
    onError: error => {
      toast.error(error.message);
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: AddUserFormData) => {
    setIsSubmitting(true);
    try {
      await addUserMutation.mutateAsync(data);
    } catch {
      // Error is handled by the mutation's onError callback
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input
                  placeholder="user@example.com"
                  type="email"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {isSubmitting ? "Sending Invitation..." : "Send Invitation"}
        </Button>

        {form.formState.errors.root && (
          <p className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
      </form>
    </Form>
  );
}
