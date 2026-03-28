import { getDB } from "./db";

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
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
  await db
    .prepare(
      `INSERT INTO users (id, email, name, image, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?5)
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
