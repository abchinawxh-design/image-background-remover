import { NextResponse } from "next/server";
import { removeBackground } from "@/lib/background-removal";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No file uploaded. Please choose an image." },
        { status: 400 }
      );
    }

    const result = await removeBackground(file);
    const baseName = (file.name || "image")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "image";

    const filename = `${baseName}-no-bg.${result.fileExtension}`;
    const dataUrl = `data:${result.contentType};base64,${result.buffer.toString("base64")}`;

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

    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
