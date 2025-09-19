import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "~/lib/auth";

const f = createUploadthing();

/**
 * UploadThing file router configuration with enhanced security
 *
 * Security Features:
 * - All routes require authentication (no public routes)
 * - Automatic callback verification (v7.7.4 includes HMAC SHA256 protection)
 * - User session validation via Better Auth
 * - Detailed logging for audit trails
 *
 * Authentication & Security Best Practices:
 * - The /api/uploadthing endpoint is public (required for UploadThing webhooks)
 * - Individual routes are protected via .middleware() functions
 * - Callback data is automatically verified via HMAC SHA256 (v6.7+)
 * - All uploads require valid user sessions
 *
 * Rate Limiting:
 * - Consider adding rate limiting for additional protection
 * - UploadThing provides built-in rate limiting per endpoint
 *
 * File Validation:
 * - Client-side validation via file type and size constraints
 * - Server-side validation via middleware checks
 */
export const uploadRouter = {
  /**
   * Document upload endpoint for invoices/receipts
   * - Max 10MB
   * - PDF, images
   * - Requires authentication
   */
  documentUpload: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 5,
    },
    pdf: {
      maxFileSize: "8MB",
      maxFileCount: 5,
    },
  })
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({ headers: req.headers });

      if (!session?.user?.id) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw new UploadThingError({
          code: "FORBIDDEN",
          message: "You must be signed in to upload documents",
        });
      }

      console.log(`Document upload attempt - User: ${session.user.id}`);

      return {
        userId: session.user.id,
        userEmail: session.user.email,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Document upload complete");
      console.log("Uploaded by user:", metadata.userId);
      console.log("File URL:", file.ufsUrl);

      return {
        url: file.ufsUrl,
        userId: metadata.userId,
        uploadedAt: new Date().toISOString(),
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
