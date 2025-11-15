import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Req = z.object({
  contentType: z.string().min(1),
  size: z.number().nonnegative(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = Req.parse(body);

    const key = crypto.randomUUID();
    const uploadUrl = `/api/upload/mock-put?key=${key}&contentType=${encodeURIComponent(
      input.contentType
    )}`;
    const blobUrl = `mock://local/${key}`;

    return NextResponse.json({ ok: true, uploadUrl, blobUrl }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
