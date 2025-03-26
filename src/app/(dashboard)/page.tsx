"use client";

import React from "react";
import { DashboardNavbar } from "~/components/organizations/navbar";
import { OrganizationCard } from "~/components/organizations/organization-card";
import { EmptyOrganizations } from "~/components/organizations/empty-organizations";
import { PlusIcon } from "lucide-react";
import { Button } from "~/components/ui/button";

// Sample data - This would come from an API in a real application
const organizations = [
  {
    id: "org1",
    name: "Acme Inc",
    description:
      "A global leader in innovative solutions for businesses of all sizes. Providing cutting-edge technology and services.",
    logo: null,
    website: "www.acmeinc.com",
    industry: "Technology",
    membersCount: 12,
    plan: "Enterprise",
    createdAt: "2023-09-15T12:00:00Z",
  },
  {
    id: "org2",
    name: "Startup Hub",
    description:
      "Collaborative workspace and incubator for emerging tech startups.",
    logo: null,
    website: "www.startuphub.io",
    industry: "Business Services",
    membersCount: 5,
    plan: "Pro",
    createdAt: "2023-11-20T09:30:00Z",
  },
  {
    id: "org3",
    name: "Creative Studio",
    description:
      "Design and marketing agency specializing in brand identity and digital experiences.",
    logo: null,
    website: "www.creativestudio.design",
    industry: "Design & Marketing",
    membersCount: 8,
    plan: "Business",
    createdAt: "2024-01-05T14:45:00Z",
  },
  {
    id: "org4",
    name: "Tech Solutions",
    description:
      "IT consulting and managed services for small to medium businesses.",
    logo: null,
    website: "www.techsolutions.com",
    industry: "IT Services",
    membersCount: 15,
    plan: "Enterprise",
    createdAt: "2024-02-18T10:15:00Z",
  },
];

export default function DashboardPage() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <DashboardNavbar />
      <main className="container mx-auto flex-1 px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Your Organizations</h1>
            <p className="text-muted-foreground mt-1">
              Manage and access your organizations
            </p>
          </div>
          <Button className="gap-2 w-full sm:w-auto">
            <PlusIcon className="h-4 w-4" />
            New Organization
          </Button>
        </div>

        {organizations.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <OrganizationCard key={org.id} {...org} />
            ))}
          </div>
        ) : (
          <EmptyOrganizations />
        )}
      </main>
    </div>
  );
}
