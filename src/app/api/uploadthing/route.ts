import { createRouteHandler } from "uploadthing/next";
import { uploadRouter } from "~/server/uploadthing";

// Export routes for Next.js App Router
export const { GET, POST } = createRouteHandler({
  router: uploadRouter,
  config: {
    // Optional: Add custom error handling
    // logLevel: "debug",
  },
});
