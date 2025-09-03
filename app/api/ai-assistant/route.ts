// /app/api/ai-assistant/route.ts (Next.js App Router)
import { NextResponse } from "next/server";
import { processMessage } from "@/lib/processMessage";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const response = await processMessage(message);
    return NextResponse.json({ response });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
