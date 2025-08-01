"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { GoogleLoginButton } from "./google-button-login";
import Image from "next/image";

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
      <Card className="w-full max-w-[90%] sm:max-w-md">
        <CardHeader className="flex flex-col items-center space-y-1 px-4 sm:px-6">
          <div className="mb-4 flex justify-center">
            <Image
              src="/icon-with-text-white.svg"
              alt="OpenSyte"
              className="hidden w-[140px] sm:w-[180px] dark:block"
              width={180}
              height={40}
              priority
            />
            <Image
              src="/icon-with-text-black.svg"
              alt="OpenSyte"
              className="block w-[140px] sm:w-[180px] dark:hidden"
              width={180}
              height={40}
              priority
            />
          </div>
          <CardTitle className="text-center text-xl font-bold sm:text-2xl">
            Welcome back
          </CardTitle>
          <CardDescription className="text-center text-sm sm:text-base">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-4 sm:px-6">
          <GoogleLoginButton />
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground px-4 text-center text-xs sm:px-8 sm:text-sm">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
