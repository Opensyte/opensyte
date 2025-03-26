"use client";

import Link from "next/link";
import Image from "next/image";
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
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

type OrganizationProps = {
  id: string;
  name: string;
  description: string;
  logo?: string | null;
  membersCount: number;
  plan: string;
  createdAt?: string;
};

export function OrganizationCard({
  id,
  name,
  description,
  logo,
  membersCount,
  plan,
  createdAt,
}: OrganizationProps) {
  const planColorMap: Record<string, string> = {
    Enterprise:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    Pro: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    Business:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    Free: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
  };

  // Format date if it exists
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Card className="hover:border-primary/30 group flex h-full flex-col transition-all hover:shadow-md">
      <CardHeader className="space-y-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
              {logo ? (
                <Image
                  src={logo}
                  alt={name}
                  width={32}
                  height={32}
                  className="rounded-sm"
                />
              ) : (
                <BuildingIcon className="h-5 w-5" />
              )}
            </div>
            <CardTitle className="truncate text-lg font-semibold">
              {name}
            </CardTitle>
          </div>
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
              <DropdownMenuItem className="flex items-center gap-2">
                <PencilIcon className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive flex items-center gap-2">
                <TrashIcon className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription className="line-clamp-2 text-sm">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4 ">
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className={`${planColorMap[plan] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400"} font-medium`}
          >
            {plan}
          </Badge>
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Users className="h-3.5 w-3.5" />
            <span>
              {membersCount} {membersCount === 1 ? "member" : "members"}
            </span>
          </div>
        </div>

        {formattedDate && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Created on {formattedDate}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-muted/30 mt-auto border-t pt-3">
        <Link href={`/${id}`} className="w-full">
          <Button
            variant="default"
            className="w-full transition-colors"
          >
            View Dashboard
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
