import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  const result: Record<string, unknown> = {};

  // Check auth session
  try {
    const session = await auth();
    result.session = session
      ? { userId: session.user?.id, email: session.user?.email }
      : null;
  } catch (e) {
    result.sessionError = String(e);
  }

  // Check D1 binding
  try {
    const { env } = await getCloudflareContext();
    // @ts-expect-error runtime binding
    const db = env.DB as any;
    if (!db) {
      result.d1 = "MISSING - env.DB is undefined";
    } else {
      const test = await db.prepare("SELECT 1 as ok").first();
      result.d1 = test?.ok === 1 ? "OK" : "QUERY_FAILED";
    }
  } catch (e) {
    result.d1Error = String(e);
  }

  // Query table contents
  try {
    const { env } = await getCloudflareContext();
    // @ts-expect-error runtime binding
    const db = env.DB as any;
    if (db) {
      const users = await db.prepare("SELECT id, email, created_at FROM users LIMIT 5").all();
      const jobs = await db.prepare("SELECT id, user_id, filename, status, created_at FROM removal_jobs ORDER BY created_at DESC LIMIT 5").all();
      const usage = await db.prepare("SELECT * FROM usage_monthly LIMIT 5").all();
      result.tables = { users: users.results, jobs: jobs.results, usage: usage.results };
    }
  } catch (e) {
    result.tablesError = String(e);
  }

  return NextResponse.json(result);
}
