"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Upload, X, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { UploadDropzone } from "~/lib/uploadthing";
import type { OurFileRouter } from "~/server/uploadthing";
import { toast } from "sonner";

interface UploadThingImageUploadProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  description?: string;
  endpoint: keyof OurFileRouter;
}

export function UploadThingImageUpload({
  value,
  onChange,
  disabled = false,
  className,
  label = "Logo",
  description = "Upload a logo for your organization",
  endpoint,
}: UploadThingImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = () => {
    onChange(null);
    setError(null);
  };

  // Get endpoint-specific config
  const getEndpointConfig = () => {
    switch (endpoint) {
      case "organizationLogo":
        return {
          maxSize: "4MB",
          types: ["PNG", "JPG", "JPEG", "WEBP", "SVG"],
        };
      case "userAvatar":
        return {
          maxSize: "2MB",
          types: ["PNG", "JPG", "JPEG", "WEBP"],
        };
      case "documentUpload":
        return {
          maxSize: "10MB",
          types: ["PNG", "JPG", "JPEG", "WEBP", "PDF"],
        };
      default:
        return {
          maxSize: "4MB",
          types: ["PNG", "JPG", "JPEG", "WEBP"],
        };
    }
  };

  const config = getEndpointConfig();

  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <div className="space-y-1">
          <Label className="text-sm font-medium">{label}</Label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {/* Current Image Preview */}
        {value && (
          <div className="relative inline-block">
            <div className="relative w-20 h-20 rounded-lg overflow-hidden border bg-muted">
              <Image
                src={value}
                alt="Uploaded image"
                fill
                className="object-cover"
              />
            </div>
            {!disabled && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                onClick={handleRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {/* Upload Area */}
        {!value && !disabled && (
          <div className="space-y-4">
            <UploadDropzone
              endpoint={endpoint}
              onClientUploadComplete={res => {
                console.log("Upload completed:", res);
                if (res?.[0]?.ufsUrl) {
                  onChange(res[0].ufsUrl);
                  toast.success("File uploaded successfully!");
                  setError(null);
                }
                setIsUploading(false);
              }}
              onUploadError={(error: Error) => {
                console.error("Upload error:", error);
                const errorMessage = error.message || "Upload failed";
                setError(errorMessage);
                toast.error(errorMessage);
                setIsUploading(false);
              }}
              onUploadBegin={() => {
                setIsUploading(true);
                setError(null);
              }}
              config={{
                mode: "auto",
              }}
              appearance={{
                container: cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                  "border-muted-foreground/25 hover:border-primary/50",
                  "ut-ready:bg-primary/5 ut-uploading:bg-primary/10",
                  disabled && "opacity-50 cursor-not-allowed"
                ),
                uploadIcon: "text-primary",
                label: "text-sm font-medium text-foreground",
                allowedContent: "text-xs text-muted-foreground",
                button: cn(
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "h-9 px-4 py-2 text-sm font-medium",
                  "rounded-md transition-colors",
                  "ut-ready:bg-primary ut-uploading:bg-primary/80"
                ),
              }}
              content={{
                label: isUploading
                  ? "Uploading..."
                  : `Drop your ${label.toLowerCase()} here, or browse`,
                allowedContent: `Max ${config.maxSize} • ${config.types.join(", ")}`,
                button: isUploading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Browse Files
                  </div>
                ),
              }}
            />
          </div>
        )}

        {/* Replace/Change Button for existing image */}
        {value && !disabled && (
          <div className="space-y-3">
            <UploadDropzone
              endpoint={endpoint}
              onClientUploadComplete={res => {
                console.log("Upload completed:", res);
                if (res?.[0]?.ufsUrl) {
                  onChange(res[0].ufsUrl);
                  toast.success("File updated successfully!");
                  setError(null);
                }
                setIsUploading(false);
              }}
              onUploadError={(error: Error) => {
                console.error("Upload error:", error);
                const errorMessage = error.message || "Upload failed";
                setError(errorMessage);
                toast.error(errorMessage);
                setIsUploading(false);
              }}
              onUploadBegin={() => {
                setIsUploading(true);
                setError(null);
              }}
              config={{
                mode: "auto",
              }}
              appearance={{
                container: cn(
                  "border rounded-lg p-4 text-center transition-colors",
                  "border-muted-foreground/25 hover:border-primary/50",
                  "ut-ready:bg-muted/50 ut-uploading:bg-primary/10"
                ),
                uploadIcon: "h-8 w-8 text-primary",
                label: "text-sm font-medium text-foreground",
                allowedContent: "text-xs text-muted-foreground",
                button: cn(
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "h-8 px-3 py-1 text-sm",
                  "rounded-md transition-colors"
                ),
              }}
              content={{
                label: isUploading
                  ? "Uploading..."
                  : `Change ${label.toLowerCase()}`,
                allowedContent: `Max ${config.maxSize} • ${config.types.join(", ")}`,
                button: isUploading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Upload className="h-3 w-3" />
                    Change
                  </div>
                ),
              }}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
