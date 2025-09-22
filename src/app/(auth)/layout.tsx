import { headers } from "next/headers";
import { auth } from "~/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Opensyte | Authentication",
  description: "All in one business solution",
  icons: [{ rel: "icon", url: "/icon-white.svg" }],
};

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) return redirect("/");

  return <>{children}</>;
}
