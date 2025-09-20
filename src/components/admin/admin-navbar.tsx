"use client";

import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import Image from "next/image";
import { authClient } from "~/lib/auth-client";
import { useRouter } from "next/navigation";

export function AdminNavbar() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  return (
    <nav className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left side - Back button and Admin title */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>

          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground hidden md:block">
                Early Access Management
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Logo and User menu */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="hidden sm:block">
            <Image
              src="/icon-with-text-white.svg"
              alt="OpenSyte"
              className="hidden h-6 w-auto dark:block"
              width={90}
              height={24}
              priority
            />
            <Image
              src="/icon-with-text-black.svg"
              alt="OpenSyte"
              className="block h-6 w-auto dark:hidden"
              width={90}
              height={24}
              priority
            />
          </Link>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="hover:ring-primary/20 h-8 w-8 cursor-pointer transition-all hover:ring-2">
                <AvatarImage
                  src={session?.user?.image ?? "/avatars/user.jpg"}
                  alt={session?.user?.name ?? "User"}
                />
                <AvatarFallback>
                  {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {session?.user?.name ?? "Admin User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session?.user?.email ?? "admin@example.com"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push("/dashboard")}
                className="cursor-pointer"
              >
                Go to Dashboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await authClient.signOut();
                  window.location.href = "/";
                }}
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
