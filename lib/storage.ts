import { z } from "zod";
import { env } from "./env";

const MAX_SIZE_BYTES = 50 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
]);

export const UploadRequestSchema = z.object({
  contentType: z.string().min(1),
  size: z.number().int().min(1).max(MAX_SIZE_BYTES),
});
export type UploadRequestInput = z.infer<typeof UploadRequestSchema>;

const endpoint = "https://api.vercel.com/v2/blobs/generate-upload-url";

type UploadUrlResponse = {
  uploadUrl: string;
  blobUrl: string;
};

export async function createUploadUrl(input: UploadRequestInput): Promise<UploadUrlResponse> {
  const parsed = UploadRequestSchema.parse(input);
  if (!ACCEPTED_TYPES.has(parsed.contentType.toLowerCase())) {
    throw new Error("許可されていない contentType です");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.BLOB_READ_WRITE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ contentType: parsed.contentType, contentLength: parsed.size }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Vercel Blob API error (${response.status}): ${text}`);
  }

  const json = (await response.json()) as UploadUrlResponse;
  return json;
}
