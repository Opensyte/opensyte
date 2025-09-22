import { createAuthClient } from "better-auth/react";
import { env } from "~/env";

export const authClient = createAuthClient({
  /** the base url of the server (optional if you're using the same domain) */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  baseURL: env.NEXT_PUBLIC_APP_URL,
});
