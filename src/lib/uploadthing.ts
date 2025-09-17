import {
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";
import type { OurFileRouter } from "~/server/uploadthing";

/**
 * Generate UploadThing components with our file router types
 */
export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();

/**
 * Helper function to get upload endpoint configuration
 */
export const getUploadConfig = (endpoint: keyof OurFileRouter) => {
  switch (endpoint) {
    case "organizationLogo":
      return {
        maxFileSize: "4MB",
        acceptedTypes: ["image/*"],
        endpoint: "organizationLogo" as const,
      };
    case "userAvatar":
      return {
        maxFileSize: "2MB",
        acceptedTypes: ["image/*"],
        endpoint: "userAvatar" as const,
      };
    case "documentUpload":
      return {
        maxFileSize: "10MB",
        acceptedTypes: ["image/*", "application/pdf"],
        endpoint: "documentUpload" as const,
      };
    default:
      throw new Error(`Unknown upload endpoint: ${String(endpoint)}`);
  }
};
