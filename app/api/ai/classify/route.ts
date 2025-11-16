import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { classifyDocument } from "@/lib/ai";
import { ClassifyRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const correlationId = randomUUID();
  try {
    const payload = await req.json();
    const input = ClassifyRequestSchema.parse(payload);
    const result = await classifyDocument(input);

    return NextResponse.json({ ...result, correlationId }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: error.issues[0]?.message ?? "Invalid payload",
          },
          correlationId,
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message,
        },
        correlationId,
      },
      { status: 500 },
    );
  }
}
