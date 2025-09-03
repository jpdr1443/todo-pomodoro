// /app/api/ai-assistant/route.ts
import { NextResponse } from "next/server";
import { processMessage } from "@/lib/processMessage";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const from = formData.get("From") as string;
    const body = formData.get("Body") as string;

    console.log("📩 Mensaje recibido:", from, body);

    const response = await processMessage(body);

    // Twilio espera XML
    return new NextResponse(
      `<Response><Message>${response}</Message></Response>`,
      { headers: { "Content-Type": "application/xml" } }
    );
  } catch (err: any) {
    return new NextResponse(
      `<Response><Message>Error: ${err.message}</Message></Response>`,
      { headers: { "Content-Type": "application/xml" }, status: 500 }
    );
  }
}
