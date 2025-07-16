import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { headers } from "next/headers";
import { auth } from "~/lib/auth";
import { redirect } from "next/navigation";
import { Toaster } from "~/components/ui/sonner";

export const metadata: Metadata = {
  title: "Opensyte",
  description: "All in one business solution",
  icons: [{ rel: "icon", url: "/icon-white.svg" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return redirect("/sign-in");
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} dark`}>
      <body>
        <TRPCReactProvider>
          {children}
          <Toaster />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
