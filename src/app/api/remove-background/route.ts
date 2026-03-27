import { NextResponse } from "next/server";
import { removeBackground } from "@/lib/background-removal";
import { auth } from "@/auth";
import { createJob } from "@/lib/jobs";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function POST(request: Request) {
  // Capture CF context + DB binding at the very start of the handler,
  // before any async operation that could break AsyncLocalStorage.
  let db: any = null;
  try {
    const { env } = await getCloudflareContext();
    db = (env as any).DB ?? null;
  } catch (e) {
    console.error("[remove-bg] getCloudflareContext failed:", e);
  }

  let session = null;
  try { session = await auth(); } catch (e) { console.error("[remove-bg] auth() failed:", e); }

  const userId = session?.user?.id ?? null;
  console.log("[remove-bg] userId:", userId, "db:", db ? "OK" : "MISSING");

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

    // Use the DB reference captured at handler start
    if (db) {
      try {
        const id = crypto.randomUUID();
        const now = Date.now();
        await db
          .prepare(
            `INSERT INTO removal_jobs (id, user_id, filename, provider, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
          )
          .bind(id, userId, filename, result.provider, "success", now)
          .run();

        if (userId) {
          const yearMonth = new Date().toISOString().slice(0, 7);
          await db
            .prepare(
              `INSERT INTO usage_monthly (user_id, year_month, count)
               VALUES (?1, ?2, 1)
               ON CONFLICT(user_id, year_month) DO UPDATE SET count = count + 1`
            )
            .bind(userId, yearMonth)
            .run();
        }
        jobRecorded = true;
      } catch (e) {
        jobError = String(e);
        console.error("[remove-bg] D1 write failed:", e);
      }
    } else {
      jobError = "db binding missing";
    }

    return NextResponse.json({
      success: true,
      filename,
      provider: result.provider,
      contentType: result.contentType,
      resultUrl: dataUrl,
      _debug: { userId, dbOk: !!db, jobRecorded, jobError },
      note: result.provider === "mock" ? "Mock mode is active." : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove background. Please try again.";
    if (db) {
      try {
        const id = crypto.randomUUID();
        await db
          .prepare(`INSERT INTO removal_jobs (id, user_id, filename, provider, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
          .bind(id, userId, filename, "unknown", "failed", Date.now())
          .run();
      } catch (e) { console.error("[remove-bg] D1 failed-job write error:", e); }
    }
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
