import "~/styles/globals.css";
import { headers } from "next/headers";
import { Geist } from "next/font/google";
import { auth } from "~/lib/auth";
import { redirect } from "next/navigation";

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

  if (session) return redirect("/");

  return (
    <html lang="en" className={`${geist.variable} dark`}>
      <body>{children}</body>
    </html>
  );
}
