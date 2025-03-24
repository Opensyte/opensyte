
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Toggle } from "~/components/ui/toggle";

export default async function Home() {


  return (
    <>
    <Button variant={'secondary'}>Test</Button>
    <Input placeholder="test input"/>
    <Toggle>Test toggle</Toggle>
    </>
  );
}
