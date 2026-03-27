import { getDB } from "./db";

export interface RemovalJob {
  id: string;
  user_id: string | null;
  filename: string;
  provider: string;
  status: string;
  created_at: number;
}

/**
 * Record a background removal attempt.
 * user_id may be null for anonymous requests.
 * Accepts optional pre-fetched db instance to avoid async context issues.
 */
export async function createJob(
  job: {
    userId: string | null;
    filename: string;
    provider: string;
    status: "success" | "failed";
  },
  db?: any
): Promise<void> {
  const database = db ?? (await getDB());
  const id = crypto.randomUUID();
  const now = Date.now();

  await database
    .prepare(
      `INSERT INTO removal_jobs (id, user_id, filename, provider, status, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    )
    .bind(id, job.userId, job.filename, job.provider, job.status, now)
    .run();

  if (job.userId && job.status === "success") {
    const yearMonth = new Date().toISOString().slice(0, 7);
    await database
      .prepare(
        `INSERT INTO usage_monthly (user_id, year_month, count)
         VALUES (?1, ?2, 1)
         ON CONFLICT(user_id, year_month) DO UPDATE SET count = count + 1`
      )
      .bind(job.userId, yearMonth)
      .run();
  }
}

export async function listJobsByUser(userId: string, db?: any): Promise<RemovalJob[]> {
  const database = db ?? (await getDB());
  const result = await database
    .prepare(
      `SELECT * FROM removal_jobs
       WHERE user_id = ?1
       ORDER BY created_at DESC
       LIMIT 20`
    )
    .bind(userId)
    .all<RemovalJob>();
  return result.results;
}

export async function getMonthlyUsage(
  userId: string,
  yearMonth?: string,
  db?: any
): Promise<number> {
  const database = db ?? (await getDB());
  const ym = yearMonth ?? new Date().toISOString().slice(0, 7);
  const row = await database
    .prepare(
      `SELECT count FROM usage_monthly WHERE user_id = ?1 AND year_month = ?2`
    )
    .bind(userId, ym)
    .first<{ count: number }>();
  return row?.count ?? 0;
}
