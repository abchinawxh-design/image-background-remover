import { NextResponse } from "next/server";
import { removeBackground } from "@/lib/background-removal";
import { auth } from "@/auth";
import { createJob } from "@/lib/jobs";

export async function POST(request: Request) {
  // Get session — user_id may be null for anonymous requests
  const session = await auth();
  const userId = session?.user?.id ?? null;

  let filename = "image";
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No file uploaded. Please choose an image." },
        { status: 400 }
      );
    }

    const baseName = (file.name || "image")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "image";

    const result = await removeBackground(file);
    filename = `${baseName}-no-bg.${result.fileExtension}`;
    const dataUrl = `data:${result.contentType};base64,${result.buffer.toString("base64")}`;

    // Record job (non-fatal)
    try {
      await createJob({
        userId,
        filename,
        provider: result.provider,
        status: "success",
      });
    } catch (e) {
      console.error("[remove-background] createJob failed:", e);
    }

    return NextResponse.json({
      success: true,
      filename,
      provider: result.provider,
      contentType: result.contentType,
      resultUrl: dataUrl,
      note:
        result.provider === "mock"
          ? "Mock mode is active. The current result reuses the original image until a real provider is connected."
          : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to remove background. Please try again.";

    // Record failed job (non-fatal)
    try {
      await createJob({
        userId,
        filename,
        provider: "unknown",
        status: "failed",
      });
    } catch (e) {
      console.error("[remove-background] createJob (failed) error:", e);
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
