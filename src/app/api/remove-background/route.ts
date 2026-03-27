import { NextResponse } from "next/server";
import { removeBackground } from "@/lib/background-removal";
import { auth } from "@/auth";
import { createJob } from "@/lib/jobs";

export async function POST(request: Request) {
  let session = null;
  try { session = await auth(); } catch (e) { console.error("[remove-bg] auth() failed:", e); }

  const userId = session?.user?.id ?? null;

  let filename = "image";
  let jobRecorded = false;
  let jobError: string | null = null;

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

    try {
      await createJob({ userId, filename, provider: result.provider, status: "success" });
      jobRecorded = true;
    } catch (e) {
      jobError = String(e);
      console.error("[remove-bg] createJob failed:", e);
    }

    return NextResponse.json({
      success: true,
      filename,
      provider: result.provider,
      contentType: result.contentType,
      resultUrl: dataUrl,
      _debug: { userId, jobRecorded, jobError },
      note: result.provider === "mock" ? "Mock mode is active." : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove background. Please try again.";

    try {
      await createJob({ userId, filename, provider: "unknown", status: "failed" });
    } catch (e) {
      console.error("[remove-bg] createJob (failed job) error:", e);
    }

    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
