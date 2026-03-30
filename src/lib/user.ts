import { getDB } from "./db";
import type { Plan } from "./plans";

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  plan: Plan;
  plan_expires_at: number | null;
  credits_total: number;
  credits_used: number;
  created_at: number;
  updated_at: number;
}

export async function upsertUser(user: {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<void> {
  const db = await getDB();
  const now = Date.now();
  // Conflict on email (UNIQUE): handles the case where the same Google account
  // was previously stored with a different id (e.g., old UUID bug).
  // We always trust the latest Google sub as the canonical id.
  // credits_total/credits_used/plan are NOT overwritten on re-login.
  await db
    .prepare(
      `INSERT INTO users (id, email, name, image, plan, plan_expires_at, credits_total, credits_used, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, 'free', NULL, 3, 0, ?5, ?5)
       ON CONFLICT(email) DO UPDATE SET
         id         = excluded.id,
         name       = excluded.name,
         image      = excluded.image,
         updated_at = excluded.updated_at`
    )
    .bind(user.id, user.email, user.name ?? null, user.image ?? null, now)
    .run();
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await getDB();
  const row = await db
    .prepare(`SELECT * FROM users WHERE id = ?1`)
    .bind(id)
    .first();
  return (row as User) ?? null;
}

export async function consumeCredit(id: string): Promise<void> {
  const db = await getDB();
  await db
    .prepare(`UPDATE users SET credits_used = credits_used + 1, updated_at = ?2 WHERE id = ?1`)
    .bind(id, Date.now())
    .run();
}

export async function upgradeToPro(
  id: string,
  plan: 'pro_monthly' | 'pro_yearly',
  paymentRef?: string
): Promise<void> {
  const db = await getDB();
  const now = Date.now();
  const ms = plan === 'pro_yearly' ? 365 * 24 * 60 * 60 * 1000 : 31 * 24 * 60 * 60 * 1000;
  const expiresAt = now + ms;

  await db.prepare(
    `UPDATE users SET plan = 'pro', plan_expires_at = ?2, updated_at = ?3 WHERE id = ?1`
  ).bind(id, expiresAt, now).run();

  // Record subscription
  const subId = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO subscriptions (id, user_id, plan, status, started_at, expires_at, payment_ref, created_at)
     VALUES (?1, ?2, ?3, 'active', ?4, ?5, ?6, ?4)`
  ).bind(subId, id, plan, now, expiresAt, paymentRef ?? null).run();
}
