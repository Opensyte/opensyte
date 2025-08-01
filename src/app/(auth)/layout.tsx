import "~/styles/globals.css";
import { headers } from "next/headers";
import { Geist } from "next/font/google";
import { auth } from "~/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Opensyte | Authentication",
  description: "All in one business solution",
  icons: [{ rel: "icon", url: "/icon-white.svg" }],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) return redirect("/");

  return (
    <html lang="en" className={`${geist.variable} dark`}>
      <body>{children}</body>
    </html>
  );
}
