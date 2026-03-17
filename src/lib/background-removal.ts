export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export type RemovalResult = {
  buffer: Buffer;
  contentType: string;
  fileExtension: string;
  provider: "mock" | "configured";
};

export function validateImageFile(file: File) {
  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    throw new Error("Unsupported file format. Please upload JPG, PNG, or WebP.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File is too large. Please upload an image under 10MB.");
  }
}

function extensionFromType(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

async function mockRemoveBackground(file: File): Promise<RemovalResult> {
  const arrayBuffer = await file.arrayBuffer();
  const contentType = file.type || "image/png";

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
    fileExtension: extensionFromType(contentType),
    provider: "mock",
  };
}

export async function removeBackground(file: File): Promise<RemovalResult> {
  validateImageFile(file);

  // MVP fallback: until a real provider is wired up, we return the original image.
  // This keeps the app testable locally and makes provider replacement straightforward.
  const provider = process.env.BG_REMOVAL_PROVIDER;
  const apiKey = process.env.BG_REMOVAL_API_KEY;

  if (!provider || !apiKey) {
    return mockRemoveBackground(file);
  }

  // Placeholder for a real provider integration in a later step.
  // If configured values exist but implementation is not yet added, fail clearly.
  throw new Error(
    "A background removal provider is configured, but real provider integration has not been implemented yet."
  );
}
