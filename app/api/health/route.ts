import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

export async function GET() {
  try {
    if (!env.AIRTABLE_API_KEY || !env.AIRTABLE_BASE_ID) {
      return NextResponse.json({ ok: false, reason: 'MISSING_ENV' }, { status: 500 });
    }
    const url = `https://api.airtable.com/v0/meta/bases/${encodeURIComponent(env.AIRTABLE_BASE_ID)}/tables`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` },
    });

    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ ok: false, reason: 'AIRTABLE_ERR', status: res.status, body: t }, { status: 502 });
    }
    const json = await res.json() as { tables: Array<{ name: string }> };
    const tableNames = json.tables?.map(t => t.name) ?? [];
    const required = ['Users', 'Companies', 'CompanyUsers'];
    const missing = required.filter(r => !tableNames.includes(r));

    return NextResponse.json({ ok: missing.length === 0, tables: tableNames, missing }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, reason: 'UNHANDLED', error: message }, { status: 500 });
  }
}
