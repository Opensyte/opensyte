"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { BuildingIcon, Users, CalendarIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";

interface OrganizationCardProps {
  id: string;
  name: string;
  description?: string | null;
  logo?: string | null;
  website?: string | null;
  industry?: string | null;
  membersCount: number;
  userRole: string;
  createdAt: string;
}

export function OrganizationCard({
  id,
  name,
  description,
  logo,
  website,
  industry,
  membersCount,
  userRole,
  createdAt,
}: OrganizationCardProps) {
  const formattedDate = useMemo(() => {
    if (!createdAt) return null;

    try {
      const date = new Date(createdAt);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  }, [createdAt]);

  const canEnter = userRole !== "CONTRACTOR" && userRole !== "VIEWER";

  return (
    <div className="h-full">
      <Card className="hover:border-primary/30 group flex h-full flex-col gap-3 transition-all hover:shadow-md">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
                {logo ? (
                  <Image
                    src={logo}
                    alt={name}
                    width={36}
                    height={36}
                    className="rounded-md"
                  />
                ) : (
                  <BuildingIcon className="h-6 w-6" />
                )}
              </div>
              <div>
                <CardTitle className="truncate text-lg font-semibold">
                  {name}
                </CardTitle>
                <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
                  <Users className="h-3.5 w-3.5" />
                  <span>
                    {membersCount} {membersCount === 1 ? "member" : "members"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <CardDescription className="line-clamp-3 text-sm leading-relaxed">
            {description ?? "No description provided"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow space-y-4 pt-0">
          {industry && (
            <div className="text-muted-foreground text-sm">
              <span className="font-medium">Industry:</span> {industry}
            </div>
          )}

          {website && (
            <div className="text-muted-foreground text-sm">
              <span className="font-medium">Website:</span>{" "}
              <a
                href={
                  website.startsWith("http") ? website : `https://${website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {website}
              </a>
            </div>
          )}

          {formattedDate && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Created on {formattedDate}</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0">
          <Button
            asChild
            variant={canEnter ? "default" : "secondary"}
            className="w-full"
          >
            <Link
              href={`/${id}`}
              className={!canEnter ? "cursor-not-allowed opacity-50" : ""}
              aria-disabled={!canEnter}
            >
              {canEnter ? "Enter Organization" : "View Only (Limited Access)"}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
