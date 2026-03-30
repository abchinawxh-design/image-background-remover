import { NextResponse } from "next/server";
import { removeBackground } from "@/lib/background-removal";
import { auth } from "@/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { checkQuota } from "@/lib/plans";
import type { UserPlanData } from "@/lib/plans";

export async function POST(request: Request) {
  // Capture CF context at handler start — must be before any async gap.
  let db: any = null;
  let bgProvider: string | undefined;
  let bgApiKey: string | undefined;
  try {
    const { env } = await getCloudflareContext();
    db = (env as any).DB ?? null;
    bgProvider = (env as any).BG_REMOVAL_PROVIDER ?? process.env.BG_REMOVAL_PROVIDER;
    bgApiKey = (env as any).BG_REMOVAL_API_KEY ?? process.env.BG_REMOVAL_API_KEY;
  } catch (e) {
    console.error("[remove-bg] getCloudflareContext failed:", e);
    bgProvider = process.env.BG_REMOVAL_PROVIDER;
    bgApiKey = process.env.BG_REMOVAL_API_KEY;
  }

  // ── Auth check ──────────────────────────────────────────────────────────
  let session = null;
  try { session = await auth(); } catch (e) { console.error("[remove-bg] auth() failed:", e); }

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Please sign in to use this feature.", code: "not_logged_in" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  // ── Quota check ─────────────────────────────────────────────────────────
  let userPlan: UserPlanData | null = null;
  let monthlyUsed = 0;

  if (db) {
    try {
      const userRow = await db.prepare(
        `SELECT id, plan, plan_expires_at, credits_total, credits_used FROM users WHERE id = ?1`
      ).bind(userId).first();

      if (userRow) {
        userPlan = userRow as UserPlanData;
        const yearMonth = new Date().toISOString().slice(0, 7);
        const usageRow = await db.prepare(
          `SELECT count FROM usage_monthly WHERE user_id = ?1 AND year_month = ?2`
        ).bind(userId, yearMonth).first();
        monthlyUsed = (usageRow as any)?.count ?? 0;

        const quota = checkQuota(userPlan, monthlyUsed);
        if (!quota.allowed) {
          let msg = "You've reached your usage limit. Upgrade to Pro for more.";
          if (quota.reason === 'no_credits') {
            msg = "You've used all your free credits. Upgrade to Pro for 100 removals/month.";
          } else if (quota.reason === 'monthly_limit_reached') {
            msg = `You've reached your monthly limit (${quota.monthlyLimit} removals). Limit resets next month.`;
          }
          return NextResponse.json(
            { success: false, error: msg, code: "quota_exceeded", plan: userPlan?.plan },
            { status: 403 }
          );
        }
      }
    } catch (e) {
      console.error("[remove-bg] quota check failed:", e);
      // fail open — don't block legit users on DB errors
    }
  }

  // ── Parse form data ──────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    return NextResponse.json({ success: false, error: "Failed to parse upload." }, { status: 400 });
  }

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

  // ── Remove background ────────────────────────────────────────────────────
  let result;
  try {
    result = await removeBackground(file, { provider: bgProvider, apiKey: bgApiKey });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove background. Please try again.";
    if (db) {
      try {
        await db.prepare(
          `INSERT INTO removal_jobs (id, user_id, filename, provider, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
        ).bind(crypto.randomUUID(), userId, file.name, "unknown", "failed", Date.now()).run();
      } catch (e) { console.error("[remove-bg] D1 failed-job write error:", e); }
    }
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const filename = `${baseName}-no-bg.${result.fileExtension}`;

  // ── Record usage ─────────────────────────────────────────────────────────
  if (db) {
    try {
      const now = Date.now();
      await db.prepare(
        `INSERT INTO removal_jobs (id, user_id, filename, provider, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      ).bind(crypto.randomUUID(), userId, filename, result.provider, "success", now).run();

      const yearMonth = new Date().toISOString().slice(0, 7);
      await db.prepare(
        `INSERT INTO usage_monthly (user_id, year_month, count) VALUES (?1, ?2, 1)
         ON CONFLICT(user_id, year_month) DO UPDATE SET count = count + 1`
      ).bind(userId, yearMonth).run();

      if (userPlan?.plan === 'free') {
        await db.prepare(
          `UPDATE users SET credits_used = credits_used + 1, updated_at = ?2 WHERE id = ?1`
        ).bind(userId, now).run();
      }
    } catch (e) {
      console.error("[remove-bg] D1 write failed:", e);
    }
  }

  // ── Return binary response (avoids large base64 JSON) ────────────────────
  return new Response(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Filename": filename,
      "X-Provider": result.provider,
      "X-Mock": result.provider === "mock" ? "1" : "0",
    },
  });
}
