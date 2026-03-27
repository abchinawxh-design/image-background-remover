import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDB } from "@/lib/db";

export async function GET() {
  const result: Record<string, unknown> = {};

  // Step 1: get session
  try {
    const session = await auth();
    result.userId = session?.user?.id ?? null;
  } catch (e) {
    result.authError = String(e);
  }

  // Step 2: get db
  let db: any = null;
  try {
    db = await getDB();
    result.dbOk = !!db;
  } catch (e) {
    result.dbError = String(e);
    return NextResponse.json(result);
  }

  // Step 3: write a test job directly
  try {
    const id = crypto.randomUUID();
    const now = Date.now();
    const userId = result.userId as string | null;
    await db
      .prepare(
        `INSERT INTO removal_jobs (id, user_id, filename, provider, status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(id, userId, "debug-test.png", "test", "success", now)
      .run();
    result.insertOk = true;
    result.insertedId = id;
  } catch (e) {
    result.insertError = String(e);
  }

  // Step 4: read back
  try {
    const rows = await db
      .prepare("SELECT * FROM removal_jobs ORDER BY created_at DESC LIMIT 3")
      .all();
    result.jobs = rows.results;
  } catch (e) {
    result.readError = String(e);
  }

  return NextResponse.json(result);
}
