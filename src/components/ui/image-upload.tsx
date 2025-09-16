"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Upload, X, ImageIcon, AlertCircle } from "lucide-react";
import { cn } from "~/lib/utils";
import { useFileUpload } from "~/hooks/use-file-upload";

interface ImageUploadProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  description?: string;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  type?: "organization-logo" | "user-avatar";
  organizationId?: string;
}

export function ImageUpload({
  value,
  onChange,
  disabled = false,
  className,
  label = "Logo",
  description = "Upload a logo for your organization",
  maxSizeMB = 5,
  acceptedFormats = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
  type = "organization-logo",
  organizationId,
}: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, deleteFile, isUploading } = useFileUpload();

  const handleFileUpload = async (file: File) => {
    setError(null);

    const result = await uploadFile(file, {
      type,
      organizationId,
      maxSizeMB,
      allowedTypes: acceptedFormats,
    });

    if (result?.url) {
      // If there was a previous file, delete it
      if (value?.startsWith("/uploads/")) {
        await deleteFile(value);
      }
      onChange(result.url);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleFileUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      void handleFileUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleRemove = async () => {
    // Delete file from server if it's a local upload
    if (value?.startsWith("/uploads/")) {
      await deleteFile(value);
    }
    onChange(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleBrowse = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

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
                alt="Uploaded logo"
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
        {!value && (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
              dragOver && !disabled
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25",
              disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              "hover:border-primary/50 hover:bg-primary/5"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleBrowse}
          >
            <div className="space-y-3">
              <div className="flex justify-center">
                <div className="p-3 bg-muted rounded-full">
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isUploading
                    ? "Uploading..."
                    : "Drop your logo here, or browse"}
                </p>
                <div className="flex flex-wrap justify-center gap-1">
                  {acceptedFormats.map(format => (
                    <Badge key={format} variant="secondary" className="text-xs">
                      {format.split("/")[1]?.toUpperCase()}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Max {maxSizeMB}MB
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isUploading}
                className="pointer-events-none"
              >
                <Upload className="h-4 w-4 mr-2" />
                Browse Files
              </Button>
            </div>
          </div>
        )}

        {/* Replace/Change Button for existing image */}
        {value && !disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBrowse}
            disabled={isUploading}
            className="w-full sm:w-auto"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading..." : "Change Logo"}
          </Button>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(",")}
        onChange={handleFileSelect}
        disabled={disabled}
        className="hidden"
      />
    </div>
  );
}
