import { NextResponse } from "next/server";
import { removeBackground } from "@/lib/background-removal";
import { auth } from "@/auth";
import { createJob } from "@/lib/jobs";
import { getDB } from "@/lib/db";

export async function POST(request: Request) {
  // Sequential calls to preserve Cloudflare async context
  let session = null;
  let db = null;
  try { session = await auth(); } catch (e) { console.error("[remove-bg] auth() failed:", e); }
  try { db = await getDB(); } catch (e) { console.error("[remove-bg] getDB() failed:", e); }

  const userId = session?.user?.id ?? null;
  console.log("[remove-bg] userId:", userId, "db:", db ? "OK" : "MISSING");

  let filename = "image";
  let jobRecorded = false;
  let jobError = null;

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

    if (db) {
      try {
        await createJob(
          { userId, filename, provider: result.provider, status: "success" },
          db
        );
        jobRecorded = true;
        console.log("[remove-bg] createJob OK for userId:", userId);
      } catch (e) {
        jobError = String(e);
        console.error("[remove-bg] createJob failed:", e);
      }
    } else {
      jobError = "db is null";
      console.error("[remove-bg] skipping createJob: db is null");
    }

    return NextResponse.json({
      success: true,
      filename,
      provider: result.provider,
      contentType: result.contentType,
      resultUrl: dataUrl,
      _debug: { userId, dbOk: !!db, jobRecorded, jobError },
      note:
        result.provider === "mock"
          ? "Mock mode is active."
          : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove background. Please try again.";

    if (db) {
      try {
        await createJob({ userId, filename, provider: "unknown", status: "failed" }, db);
      } catch (e) {
        console.error("[remove-bg] createJob (failed job) error:", e);
      }
    }

    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
