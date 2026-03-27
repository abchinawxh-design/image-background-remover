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
    const db = env.DB as D1Database | undefined;
    if (!db) {
      result.d1 = "MISSING - env.DB is undefined";
    } else {
      const test = await db.prepare("SELECT 1 as ok").first<{ ok: number }>();
      result.d1 = test?.ok === 1 ? "OK" : "QUERY_FAILED";
    }
  } catch (e) {
    result.d1Error = String(e);
  }

  return NextResponse.json(result);
}
