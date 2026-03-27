import { getDB } from "./db";

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * Upsert user on OAuth login.
 * Called from NextAuth session/jwt callback.
 */
export async function upsertUser(user: {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<void> {
  const db = await getDB();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO users (id, email, name, image, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?5)
       ON CONFLICT(id) DO UPDATE SET
         email      = excluded.email,
         name       = excluded.name,
         image      = excluded.image,
         updated_at = excluded.updated_at`
    )
    .bind(user.id, user.email, user.name ?? null, user.image ?? null, now)
    .run();
}

/**
 * Fetch a user by ID. Returns null if not found.
 */
export async function getUserById(id: string): Promise<User | null> {
  const db = await getDB();
  const row = await db
    .prepare(`SELECT * FROM users WHERE id = ?1`)
    .bind(id)
    .first<User>();
  return row ?? null;
}
