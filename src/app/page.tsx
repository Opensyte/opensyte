import Link from "next/link";

import { LatestPost } from "~/app/_components/post";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Toggle } from "~/components/ui/toggle";
import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });

  void api.post.getLatest.prefetch();

  return (
    <>
    <Button variant={'secondary'}>Test</Button>
    <Input placeholder="test input"/>
    <Toggle>Test toggle</Toggle>
    </>
  );
}
