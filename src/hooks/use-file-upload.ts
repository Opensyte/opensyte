import { useState } from "react";
import { toast } from "sonner";

interface UploadOptions {
  type?: "organization-logo" | "user-avatar";
  organizationId?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

interface UploadResponse {
  success: boolean;
  url?: string;
  filename?: string;
  size?: number;
  type?: string;
  error?: string;
}

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (
    file: File,
    options: UploadOptions = {}
  ): Promise<UploadResponse | null> => {
    const {
      type = "organization-logo",
      organizationId,
      maxSizeMB = 5,
      allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/svg+xml",
      ],
    } = options;

    // Client-side validation
    if (!allowedTypes.includes(file.type)) {
      toast.error(
        `Invalid file type. Please upload ${allowedTypes.map(t => t.split("/")[1]).join(", ")} files.`
      );
      return null;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${maxSizeMB}MB.`);
      return null;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      if (organizationId) {
        formData.append("organizationId", organizationId);
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as UploadResponse;

      if (!response.ok) {
        throw new Error(result.error ?? "Upload failed");
      }

      if (result.success && result.url) {
        toast.success("File uploaded successfully");
        return result;
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      toast.error(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (filePath: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/upload?path=${encodeURIComponent(filePath)}`,
        {
          method: "DELETE",
        }
      );

      const result = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Delete failed");
      }

      return result.success;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Delete failed";
      toast.error(errorMessage);
      return false;
    }
  };

  return {
    uploadFile,
    deleteFile,
    isUploading,
  };
}
