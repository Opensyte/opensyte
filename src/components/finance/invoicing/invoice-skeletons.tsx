"use client";
export function InvoiceTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-12 w-full animate-pulse rounded-md bg-muted"
        />
      ))}
    </div>
  );
}

export function InvoiceDialogSkeleton() {
  return (
    <div className="grid gap-4 py-4 sm:grid-cols-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-10 w-full animate-pulse rounded-md bg-muted"
        />
      ))}
      <div className="sm:col-span-2 h-24 animate-pulse rounded-md bg-muted" />
    </div>
  );
}
