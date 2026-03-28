import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  const result: Record<string, unknown> = {};

  // Get env vars from CF context
  let bgProvider: string | undefined;
  let bgApiKey: string | undefined;
  try {
    const { env } = await getCloudflareContext();
    bgProvider = (env as any).BG_REMOVAL_PROVIDER ?? process.env.BG_REMOVAL_PROVIDER;
    bgApiKey = (env as any).BG_REMOVAL_API_KEY ?? process.env.BG_REMOVAL_API_KEY;
  } catch (e) {
    result.cfContextError = String(e);
    bgProvider = process.env.BG_REMOVAL_PROVIDER;
    bgApiKey = process.env.BG_REMOVAL_API_KEY;
  }

  result.bgProvider = bgProvider ?? "MISSING";
  result.bgApiKeySet = !!bgApiKey;
  result.bgApiKeyPrefix = bgApiKey ? bgApiKey.slice(0, 6) + "..." : "MISSING";

  // Test a minimal remove.bg API call (account info endpoint)
  if (bgApiKey) {
    try {
      const resp = await fetch("https://api.remove.bg/v1.0/account", {
        headers: { "X-Api-Key": bgApiKey },
      });
      const text = await resp.text();
      result.removebgStatus = resp.status;
      result.removebgResponse = text.slice(0, 500);
    } catch (e) {
      result.removebgError = String(e);
    }
  } else {
    result.removebgSkipped = "No API key";
  }

  return NextResponse.json(result);
}
