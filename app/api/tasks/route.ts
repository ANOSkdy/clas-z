import { NextResponse } from "next/server";
import { listRecords } from "../../../lib/airtable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await listRecords<{ title:string; status?:string; assignee?:string }>("Tasks");
    return NextResponse.json({ ok: true, items: data.records }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}