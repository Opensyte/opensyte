"use client";

import { useState } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "~/components/ui/button";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "~/trpc/react";

const formSchema = z.object({
  code: z
    .string()
    .min(1, "Registration code is required")
    .max(20, "Invalid code format")
    .transform(val => val.toUpperCase().trim()),
});

type FormData = z.infer<typeof formSchema>;

interface RegistrationCodeFormProps {
  onSuccess?: () => void;
}

export function RegistrationCodeForm({ onSuccess }: RegistrationCodeFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
    },
  });

  const validateCodeMutation = api.earlyAccess.validateCode.useMutation({
    onSuccess: data => {
      setError(null);
      setSuccess(data.message);
      form.reset();

      // Call onSuccess callback if provided
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        // Default behavior: redirect to dashboard after a short delay
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2000);
      }
    },
    onError: error => {
      setSuccess(null);
      setError(error.message);
    },
  });

  const onSubmit = (data: FormData) => {
    setError(null);
    setSuccess(null);
    validateCodeMutation.mutate(data);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Enter Registration Code</CardTitle>
        <CardDescription>
          Please enter the registration code you received in your invitation
          email to access the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your code"
                      {...field}
                      disabled={validateCodeMutation.isPending}
                      className="text-center font-mono text-lg tracking-wider"
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormDescription>
                    The code is case-insensitive and was sent to your email.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={validateCodeMutation.isPending}
            >
              {validateCodeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                "Validate Code"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
