import { NextResponse } from "next/server";
import { listRecords } from "../../../lib/airtable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await listRecords("Tasks");
    return NextResponse.json({ ok: true, items: data.records }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
