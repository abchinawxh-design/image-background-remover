import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// 1x1 transparent PNG (minimal valid image for testing)
const TEST_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export async function GET() {
  const result: Record<string, unknown> = {};

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

  if (!bgApiKey) {
    result.error = "No API key — cannot test";
    return NextResponse.json(result);
  }

  // Build a minimal FormData with a real PNG file
  try {
    const pngBytes = Buffer.from(TEST_PNG_BASE64, "base64");
    const blob = new Blob([pngBytes], { type: "image/png" });
    const formData = new FormData();
    formData.append("image_file", blob, "test.png");
    formData.append("size", "auto");

    const resp = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": bgApiKey },
      body: formData,
    });

    result.removebgHttpStatus = resp.status;
    result.removebgHeaders = {
      contentType: resp.headers.get("content-type"),
      xCreditsCharged: resp.headers.get("x-credits-charged"),
      xWidth: resp.headers.get("x-width"),
      xHeight: resp.headers.get("x-height"),
    };

    if (resp.ok) {
      const buf = await resp.arrayBuffer();
      result.removebgSuccess = true;
      result.removebgResultBytes = buf.byteLength;
    } else {
      const text = await resp.text();
      result.removebgSuccess = false;
      result.removebgErrorBody = text.slice(0, 500);
    }
  } catch (e) {
    result.removebgCallError = String(e);
  }

  return NextResponse.json(result);
}
