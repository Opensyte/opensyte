import { type NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { auth } from "~/lib/auth";
import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];

const uploadSchema = z.object({
  type: z
    .enum(["organization-logo", "user-avatar"])
    .default("organization-logo"),
  organizationId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = (formData.get("type") as string) ?? "organization-logo";
    const organizationId = formData.get("organizationId") as string;

    // Validate input
    const validatedData = uploadSchema.parse({ type, organizationId });

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, WebP, and SVG files are allowed.",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Create filename with timestamp and random string
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split(".").pop();
    const fileName = `${validatedData.type}-${timestamp}-${randomString}.${fileExtension}`;

    // Create upload directory path
    const uploadDir = join(
      process.cwd(),
      "public",
      "uploads",
      validatedData.type
    );
    await mkdir(uploadDir, { recursive: true });

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    // Return the public URL
    const fileUrl = `/uploads/${validatedData.type}/${fileName}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: fileName,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("File upload error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input parameters" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle file deletion
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath?.startsWith("/uploads/")) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // Construct full file path
    const fullPath = join(process.cwd(), "public", filePath);

    try {
      const { unlink } = await import("fs/promises");
      await unlink(fullPath);

      return NextResponse.json({
        success: true,
        message: "File deleted successfully",
      });
    } catch (fileError) {
      // File might not exist, which is okay
      return NextResponse.json({
        success: true,
        message: "File not found or already deleted",
      });
    }
  } catch (error) {
    console.error("File deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
