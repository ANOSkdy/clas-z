import { NextResponse } from "next/server";
import { z } from "zod";
import { listRecords, createRecord } from "../../../lib/airtable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await listRecords("Documents");
    return NextResponse.json({ ok: true, items: data.records }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

const CreateSchema = z.object({
  title: z.string().min(1),
  blobUrl: z.string().min(1),
  size: z.number().nonnegative().optional().default(0),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = CreateSchema.parse(body);
    const rec = await createRecord("Documents", input);
    return NextResponse.json({ ok: true, id: rec.id }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const code = /invalid/i.test(message) ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status: code });
  }
}
