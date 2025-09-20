"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Lock, Mail, RefreshCw } from "lucide-react";
import { RegistrationCodeForm } from "./registration-code-form";

interface AccessDeniedPageProps {
  reason?: "not_authenticated" | "no_valid_code";
  userEmail?: string;
  callbackUrl?: string;
}

export function AccessDeniedPage({
  reason = "no_valid_code",
  userEmail,
  callbackUrl,
}: AccessDeniedPageProps) {
  const [showCodeForm, setShowCodeForm] = useState(false);

  const handleCodeValidationSuccess = () => {
    // Redirect to callback URL or dashboard
    if (callbackUrl) {
      window.location.href = callbackUrl;
    } else {
      window.location.href = "/dashboard";
    }
  };

  if (reason === "not_authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="mt-4">Authentication Required</CardTitle>
            <CardDescription>
              You need to be logged in to access this platform during the beta
              period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Please log in with your account to continue. If you don&apos;t
                have an account, you&apos;ll need a registration code to sign
                up.
              </AlertDescription>
            </Alert>
            <div className="mt-6">
              <Button
                onClick={() => (window.location.href = "/auth/login")}
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showCodeForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-4">
          <RegistrationCodeForm onSuccess={handleCodeValidationSuccess} />
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => setShowCodeForm(false)}
              className="text-sm"
            >
              ← Back to access information
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="mt-4">Beta Access Required</CardTitle>
          <CardDescription>
            This platform is currently in beta and requires a registration code
            to access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              If you have received an invitation email with a registration code,
              please enter it below to gain access.
              {userEmail && (
                <span className="block mt-2 text-sm font-medium">
                  Logged in as: {userEmail}
                </span>
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button onClick={() => setShowCodeForm(true)} className="w-full">
              Enter Registration Code
            </Button>

            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Access Status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
