import "~/styles/globals.css";
import { Geist } from "next/font/google";
import type { Metadata } from "next";
import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "~/components/ui/sonner";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Opensyte | Accept Invitation",
  description: "Accept your organization invitation on Opensyte",
  icons: [{ rel: "icon", url: "/icon-white.svg" }],
};

export default function AcceptInviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geist.variable} dark`}
      suppressHydrationWarning
    >
      <body>
        <TRPCReactProvider>
          {children}
          <Toaster />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
