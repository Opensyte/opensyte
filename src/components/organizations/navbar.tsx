"use client";

import Link from "next/link";
import { PlusIcon, MenuIcon, XIcon } from "lucide-react";
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
import { useState } from "react";

export function DashboardNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Logo and brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-semibold">
            <Image
              src={"/icon-with-text-white.svg"}
              width={120}
              height={35}
              alt="Logo"
              className="hidden dark:block"
            />
            <Image
              src={"/icon-with-text-black.svg"}
              width={120}
              height={35}
              alt="Logo"
              className="block dark:hidden"
            />
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="relative"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <XIcon className="h-5 w-5" />
            ) : (
              <MenuIcon className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-4 lg:flex">
          <Button size="sm" variant="outline" className="gap-1">
            <PlusIcon className="h-4 w-4" />
            New Organization
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="hover:ring-primary/20 h-10 w-10 cursor-pointer transition-all hover:ring-2">
                <AvatarImage src="/avatars/user.jpg" alt="User" />
                <AvatarFallback>US</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t lg:hidden">
          <div className="container mx-auto space-y-3 px-4 py-3">
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start gap-1"
            >
              <PlusIcon className="h-4 w-4" />
              New Organization
            </Button>
            <div className="border-t pt-3 pb-1">
              <div className="flex items-center gap-3 px-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/user.jpg" alt="User" />
                  <AvatarFallback>US</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">User Account</span>
                  <span className="text-muted-foreground text-xs">
                    user@example.com
                  </span>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                >
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                >
                  Settings
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                >
                  Log out
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
