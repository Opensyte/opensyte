"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "~/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AcceptInvitationClientProps {
  token?: string;
}

type UiState =
  | { status: "idle" }
  | { status: "processing" }
  | { status: "success"; organizationId: string }
  | { status: "error"; code: string; message: string };

const ERROR_MAP: Record<
  string,
  { title: string; description: string; action?: string }
> = {
  UNAUTHORIZED: {
    title: "Sign In Required",
    description: "You must sign in to accept this invitation.",
    action: "sign-in",
  },
  NO_TOKEN: {
    title: "Missing Token",
    description:
      "An invitation token is required. Please use the link from your email.",
  },
  INVALID: {
    title: "Invalid Invitation",
    description:
      "This invitation link is invalid. Ask the inviter to send a new one.",
  },
  NOT_PENDING: {
    title: "Already Handled",
    description:
      "This invitation is no longer pending. You may already be a member.",
  },
  EXPIRED: {
    title: "Invitation Expired",
    description:
      "The invitation has expired. Ask the inviter to resend a new invite.",
  },
  WRONG_EMAIL: {
    title: "Different Email Required",
    description:
      "You are signed in with a different email than the one the invite was sent to.",
  },
  GENERIC: {
    title: "Something Went Wrong",
    description: "We could not process the invitation. Please try again.",
  },
};

function mapErrorMessage(msg: string | undefined): {
  code: string;
  message: string;
} {
  if (!msg) return { code: "GENERIC", message: "Unknown error" };
  if (msg.includes("Unauthorized"))
    return { code: "UNAUTHORIZED", message: msg };
  if (msg.includes("Invalid invitation token"))
    return { code: "INVALID", message: msg };
  if (msg.includes("Invitation is not pending"))
    return { code: "NOT_PENDING", message: msg };
  if (msg.includes("Invitation expired"))
    return { code: "EXPIRED", message: msg };
  if (msg.includes("different email"))
    return { code: "WRONG_EMAIL", message: msg };
  return { code: "GENERIC", message: msg };
}

function CenterContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

function getErrorMeta(code: string): {
  title: string;
  description: string;
  action?: string;
} {
  return (ERROR_MAP[code] ?? ERROR_MAP.GENERIC) as {
    title: string;
    description: string;
    action?: string;
  };
}

export default function AcceptInvitationClient({
  token,
}: AcceptInvitationClientProps) {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [ui, setUi] = useState<UiState>(() =>
    token
      ? { status: "idle" }
      : { status: "error", code: "NO_TOKEN", message: "Missing token" }
  );

  const mutation = api.invitations.acceptByToken.useMutation({
    onSuccess: data => {
      setUi({ status: "success", organizationId: data.organizationId });
      // Auto redirect after a short delay
      setTimeout(() => {
        router.push(`/${data.organizationId}`);
      }, 1500);
    },
    onError: error => {
      const mapped = mapErrorMessage(error.message);
      setUi({ status: "error", ...mapped });
    },
  });

  const canAttempt = useMemo(
    () => Boolean(token && session?.user?.id),
    [token, session?.user?.id]
  );

  useEffect(() => {
    if (canAttempt && ui.status === "idle" && token) {
      setUi({ status: "processing" });
      mutation.mutate({ token }); // matches { token: string }
    }
  }, [canAttempt, ui.status, mutation, token]);

  // Loading session or initial attempt
  if (sessionLoading && ui.status !== "error") {
    return (
      <CenterContainer>
        <Card>
          <CardHeader>
            <CardTitle>Loading</CardTitle>
            <CardDescription>Preparing your invitation...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking session
            </div>
          </CardContent>
        </Card>
      </CenterContainer>
    );
  }

  // Not signed in yet
  if (!session?.user?.id && token) {
    const signInUrl = `/sign-in?callbackUrl=${encodeURIComponent(`/accept-invite?token=${token}`)}`;
    return (
      <CenterContainer>
        <Card>
          <CardHeader>
            <CardTitle>Accept Invitation</CardTitle>
            <CardDescription>
              Sign in to accept this invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button asChild className="w-full" variant="default">
                <Link href={signInUrl}>
                  <LogIn className="h-4 w-4" /> Sign In
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                You will return here automatically after signing in.
              </p>
            </div>
          </CardContent>
        </Card>
      </CenterContainer>
    );
  }

  if (ui.status === "processing") {
    return (
      <CenterContainer>
        <Card>
          <CardHeader>
            <CardTitle>Accepting Invitation</CardTitle>
            <CardDescription>
              Please wait while we add you to the organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Processing...
            </div>
          </CardContent>
        </Card>
      </CenterContainer>
    );
  }

  if (ui.status === "success") {
    return (
      <CenterContainer>
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="h-5 w-5" /> Invitation Accepted
            </CardTitle>
            <CardDescription>
              You have been added to the organization.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-0">
            <Button
              onClick={() => router.push(`/${ui.organizationId}`)}
              className="w-full"
            >
              Go to Organization
            </Button>
          </CardFooter>
        </Card>
      </CenterContainer>
    );
  }

  if (ui.status === "error") {
    const meta = getErrorMeta(ui.code);
    return (
      <CenterContainer>
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> {meta.title}
            </CardTitle>
            <CardDescription>{meta.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {ui.code === "WRONG_EMAIL" && session?.user?.email && (
              <p className="text-xs text-muted-foreground">
                Signed in as{" "}
                <span className="font-medium">{session.user.email}</span>. Sign
                out and sign in with the invited email.
              </p>
            )}
            {ui.code === "NOT_PENDING" && (
              <p className="text-xs text-muted-foreground">
                If you recently accepted, you can head to your dashboard now.
              </p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            {ui.code === "UNAUTHORIZED" && token && (
              <Button asChild className="w-full">
                <Link
                  href={`/sign-in?callbackUrl=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
                >
                  Sign In
                </Link>
              </Button>
            )}
            {ui.code === "WRONG_EMAIL" && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => authClient.signOut().catch(() => undefined)}
              >
                Sign Out
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/")}
            >
              Go Home
            </Button>
          </CardFooter>
        </Card>
      </CenterContainer>
    );
  }

  // Idle with no token edge case (already handled by error state above)
  return null;
}
