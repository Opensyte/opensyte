# tRPC & Prisma Feature Integration Guide

This guide outlines the step-by-step process for integrating a new feature with tRPC and Prisma in our T3 stack application.

## 1. Understand the Data Model

First, review the Prisma schema to understand the model you'll be working with:

- Model structure and fields
- Relationships between models
- Enums used by the model
- Indexes for query optimization

## 2. Create the tRPC Router

Create a new router file in the appropriate directory:

```typescript
// Example: src/server/api/routers/feature/myFeature.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { db } from "~/server/db";

// Create validation schemas matching Prisma models
const MyFeatureSchema = z.enum([
  "OPTION_ONE",
  "OPTION_TWO",
  // Match your Prisma enum values exactly
]);

export const myFeatureRouter = createTRPCRouter({
  // Get items by organization
  getItemsByOrganization: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const items = await db.myModel.findMany({
          where: {
            organizationId: input.organizationId,
          },
          include: {
            // Include related models as needed
            relatedModel: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        return items;
      } catch (error) {
        console.error("Failed to fetch items:", error);
        throw new Error("Failed to fetch items by organization");
      }
    }),

  // Create a new item
  createItem: publicProcedure
    .input(
      z.object({
        // Define all required fields with validation
        name: z.string().min(1, "Name is required"),
        value: z.number().min(0, "Value must be positive"),
        status: MyFeatureSchema,
        // Add other fields as needed
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const item = await db.myModel.create({
          data: input,
          include: {
            // Include related data in response
            relatedModel: true,
          },
        });

        return item;
      } catch (error) {
        console.error("Failed to create item:", error);
        throw new Error("Failed to create item");
      }
    }),

  // Add update and delete procedures following the same pattern
});
```

## 3. Register the Router in the Root Router

Add your new router to the main app router:

```typescript
// src/server/api/root.ts
import { createTRPCRouter } from "~/server/api/trpc";
import { myFeatureRouter } from "./routers/feature/myFeature";

export const appRouter = createTRPCRouter({
  // Existing routers
  existingFeature: existingFeatureRouter,
  // Your new router
  myFeature: myFeatureRouter,
});
```

## 4. Create UI Components

### 4.1 Create a Skeleton Component

```tsx
// src/components/feature/feature-skeleton.tsx
import { Skeleton } from "~/components/ui/skeleton";

export function FeatureSkeleton() {
  return (
    <div className="space-y-4">
      {/* Skeleton layout matching your actual component */}
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
```

### 4.2 Create the Main Feature Component

```tsx
// src/components/feature/feature.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { FeatureSkeleton } from "./feature-skeleton";

interface FeatureProps {
  organizationId: string;
}

export function Feature({ organizationId }: FeatureProps) {
  // tRPC queries and mutations
  const utils = api.useUtils();
  const {
    data: items = [],
    isLoading,
    error,
  } = api.myFeature.getItemsByOrganization.useQuery(
    { organizationId },
    {
      refetchOnWindowFocus: false,
      enabled: !!organizationId,
    },
  );

  const createItem = api.myFeature.createItem.useMutation({
    onSuccess: () => {
      toast.success("Item created successfully");
      utils.myFeature.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to create item", {
        description: error.message,
      });
    },
  });

  // Transform data if needed to match component expectations
  const transformedItems = items.map((item) => ({
    ...item,
    // Transform any fields as needed
  }));

  // Handle loading and error states
  if (isLoading) return <FeatureSkeleton />;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {/* Your component UI */}
      <div className="grid gap-4">
        {transformedItems.map((item) => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>
    </div>
  );
}
```

### 4.3 Create or Update the Page Component

```tsx
// src/app/(dashboard)/[orgId]/feature/page.tsx
import { Feature } from "~/components/feature/feature";

interface FeaturePageProps {
  params: { orgId: string };
}

export default function FeaturePage({ params }: FeaturePageProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold">Feature Title</h1>
      </div>
      <Feature organizationId={params.orgId} />
    </div>
  );
}
```

## 5. Form Handling with Validation

For forms, use React Hook Form with Zod validation:

```tsx
// Form component example
"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "~/trpc/react";
import { toast } from "sonner";
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

// Schema matching your tRPC input validation
const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  value: z.coerce.number().positive("Value must be positive"),
  // Add other fields
});

type FormValues = z.infer<typeof formSchema>;

export function FeatureForm({ organizationId }: { organizationId: string }) {
  const utils = api.useUtils();
  const createItem = api.myFeature.createItem.useMutation({
    onSuccess: () => {
      toast.success("Item created successfully");
      utils.myFeature.invalidate();
      form.reset();
    },
    onError: (error) => {
      toast.error("Failed to create item", {
        description: error.message,
      });
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      value: 0,
    },
  });

  function onSubmit(data: FormValues) {
    createItem.mutate({
      ...data,
      organizationId,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Add other form fields */}

        <Button
          type="submit"
          disabled={createItem.isPending}
          className="w-full sm:w-auto"
        >
          {createItem.isPending ? "Submitting..." : "Submit"}
        </Button>
      </form>
    </Form>
  );
}
```

## 6. Best Practices

1. **Type Safety**: Leverage TypeScript and Zod for end-to-end type safety
2. **Error Handling**: Always use try/catch in tRPC procedures
3. **Loading States**: Implement skeleton loaders for better UX
4. **Responsive Design**: Follow mobile-first approach with Tailwind
5. **Form Validation**: Use Zod schemas that match your Prisma models
6. **Toast Notifications**: Provide feedback for all user actions
7. **Data Transformation**: Transform API data to match UI component needs
8. **Query Invalidation**: Use `utils.yourRouter.invalidate()` after mutations

## 7. Testing

1. Test your tRPC procedures with unit tests
2. Test your UI components with React Testing Library
3. Verify form validation works as expected
4. Test error states and loading states

By following this guide, you'll create consistent, type-safe features that integrate seamlessly with our T3 stack application.
