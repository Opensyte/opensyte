import type { Metadata } from "next";

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
  return <>{children}</>;
}
