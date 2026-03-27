import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getDB() {
  const { env } = await getCloudflareContext();
  // @ts-expect-error D1Database binding injected at runtime
  return env.DB as any;
}
// 1774600882
