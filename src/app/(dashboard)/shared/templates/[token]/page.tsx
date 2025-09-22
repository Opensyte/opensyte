import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SharedTemplateView } from "~/components/templates/shared-template-view";

interface SharedTemplatePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedTemplatePage({
  params,
}: SharedTemplatePageProps) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-muted-foreground">
              Loading shared template...
            </p>
          </div>
        </div>
      }
    >
      <SharedTemplateView token={token} />
    </Suspense>
  );
}
