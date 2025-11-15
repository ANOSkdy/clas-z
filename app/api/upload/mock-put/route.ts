import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(_req: Request) {
  // 実ファイルは保存しない。UI側の進捗確認用に 200 を返す。
  return new NextResponse(null, { status: 200 });
}