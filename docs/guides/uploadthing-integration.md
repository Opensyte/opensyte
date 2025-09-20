# UploadThing S3 File Upload Integration Guide

This guide covers the UploadThing integration in OpenSyte for S3-backed file uploads.

## Overview

UploadThing has been integrated to replace the previous local file upload system with S3-backed cloud storage. This provides better scalability, reliability, and performance for file uploads.

## Features

- **S3 Cloud Storage**: Files are stored in AWS S3 through UploadThing
- **Type-Safe API**: Full TypeScript support with tRPC integration
- **Authentication**: All uploads require user authentication
- **Multiple Endpoints**: Separate endpoints for different file types
- **Progress Tracking**: Real-time upload progress and error handling
- **Drag & Drop**: Modern UI with drag-and-drop file upload
- **File Validation**: Client and server-side file type and size validation

## Setup

### 1. Environment Variables

Add the following environment variable to your `.env` file:

```bash
# Required: UploadThing API token for file uploads
UPLOADTHING_TOKEN=your_uploadthing_token_here
```

To get this value:

1. Sign up at [UploadThing](https://uploadthing.com)
2. Create a new app
3. Copy the API token from your dashboard (replaces the old secret/app ID approach)

### 2. File Router Configuration

The UploadThing file router is configured in `src/server/uploadthing.ts` with the following endpoints:

#### Document Upload (`documentUpload`)

- **Max Size**: 8MB per file (up to 5 files)
- **File Types**: PDF, JPEG, PNG, WebP
- **Authentication**: Required
- **Use Case**: Invoice attachments, receipts, documents

## Components

### UploadThingImageUpload

The main reusable component for image uploads:

```tsx
import { UploadThingImageUpload } from "~/components/ui/uploadthing-image-upload";

<UploadThingImageUpload
  value={logoUrl}
  onChange={setLogoUrl}
  disabled={false}
  label="Organization Logo"
  description="Upload a logo for your organization"
  endpoint="documentUpload"
/>;
```

**Props:**

- `value`: Current image URL (string | null)
- `onChange`: Callback when image changes
- `disabled`: Disable upload functionality
- `label`: Display label for the upload area
- `description`: Help text description
- `endpoint`: UploadThing endpoint to use

### UploadDropzone

For custom implementations, you can use the raw UploadDropzone:

```tsx
import { UploadDropzone } from "~/lib/uploadthing";

<UploadDropzone
  endpoint="documentUpload"
  onClientUploadComplete={res => {
    console.log("Files: ", res);
    setImageUrl(res[0]?.url);
  }}
  onUploadError={(error: Error) => {
    console.error("Error: ", error);
  }}
/>;
```

## API Routes

The UploadThing API route is automatically handled at `/api/uploadthing` and configured in:

- `src/app/api/uploadthing/route.ts` - Next.js API route handler
- `src/server/uploadthing.ts` - File router configuration

## Utilities

Helper utilities are available in `src/lib/uploadthing.ts`:

```tsx
import {
  UploadButton,
  UploadDropzone,
  getUploadConfig,
} from "~/lib/uploadthing";

// Get configuration for an endpoint
const config = getUploadConfig("documentUpload");
// Returns: { maxFileSize: "4MB", acceptedTypes: ["image/*"], endpoint: "documentUpload" }
```

## Migration from Local Upload

The following components have been migrated to use UploadThing:

- ✅ `AddOrganizationDialog` - Uses UploadThingImageUpload
- ✅ `EditOrganizationDialog` - Uses UploadThingImageUpload
- ✅ `OrganizationInfoForm` - Uses UploadThingImageUpload

### Removed Components

The old local file upload system has been replaced:

- `ImageUpload` component - Replaced with `UploadThingImageUpload`
- `useFileUpload` hook - No longer needed
- `/api/upload` route - Replaced with `/api/uploadthing`

## Error Handling

The integration includes comprehensive error handling:

- **Client-side validation**: File type and size validation before upload
- **Server-side validation**: Authentication and file validation
- **User feedback**: Toast notifications for success/error states
- **Loading states**: Upload progress indicators

## Security

- **Authentication Required**: All uploads require valid user session
- **File Type Validation**: Both client and server-side validation
- **Size Limits**: Enforced per endpoint
- **S3 Security**: Files stored in secure S3 buckets through UploadThing

## Troubleshooting

### Environment Variables Missing

If you see "Invalid environment variables" errors, ensure:

1. `.env` file exists in project root
2. `UPLOADTHING_TOKEN` is set with your API token from UploadThing dashboard
3. Token is copied correctly from UploadThing dashboard

### Upload Failures

Common issues:

- **File too large**: Check endpoint size limits
- **Invalid file type**: Ensure file matches accepted types
- **Authentication**: User must be signed in
- **Network issues**: Check internet connection and UploadThing status

### Development vs Production

- Development: Uses UploadThing test environment
- Production: Uses UploadThing production environment
- Ensure environment variables are set correctly for each environment

## Best Practices

1. **File Validation**: Always validate files on both client and server
2. **Error Handling**: Provide clear error messages to users
3. **Loading States**: Show upload progress for better UX
4. **Cleanup**: Remove old files when replacing (if needed)
5. **Testing**: Test uploads in both development and production environments

## Future Enhancements

Potential improvements for the UploadThing integration:

- **File Management**: Admin interface to manage uploaded files
- **Image Optimization**: Automatic image resizing and optimization
- **CDN Integration**: Optional CDN for faster file delivery
- **Bulk Uploads**: Support for multiple file uploads
- **File Versioning**: Keep history of file changes
