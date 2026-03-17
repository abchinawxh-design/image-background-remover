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

async function removeBackgroundWithRemoveBg(
  file: File,
  apiKey: string
): Promise<RemovalResult> {
  const formData = new FormData();
  formData.append("image_file", file, file.name || "upload.png");
  formData.append("size", "auto");

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }

    throw new Error(
      `remove.bg request failed (${response.status}).${detail ? ` ${detail}` : ""}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: "image/png",
    fileExtension: "png",
    provider: "configured",
  };
}

export async function removeBackground(file: File): Promise<RemovalResult> {
  validateImageFile(file);

  const provider = process.env.BG_REMOVAL_PROVIDER;
  const apiKey = process.env.BG_REMOVAL_API_KEY;

  if (!provider || !apiKey) {
    return mockRemoveBackground(file);
  }

  if (provider === "removebg") {
    return removeBackgroundWithRemoveBg(file, apiKey);
  }

  throw new Error(`Unsupported background removal provider: ${provider}`);
}
