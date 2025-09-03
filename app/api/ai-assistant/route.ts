import { NextResponse } from "next/server";
import { processMessage } from "@/lib/processMessage";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const from = formData.get("From") as string | null;
    const body = formData.get("Body") as string | null;

    if (!body) {
      return new NextResponse(
        `<Response><Message>No se recibió un mensaje válido</Message></Response>`,
        { headers: { "Content-Type": "application/xml" }, status: 400 }
      );
    }

    console.log("📩 Mensaje recibido:", from, body);

    const response = await processMessage(body);

    return new NextResponse(
      `<Response><Message>${response}</Message></Response>`,
      { headers: { "Content-Type": "application/xml" } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Error desconocido";
    return new NextResponse(
      `<Response><Message>Error: ${errorMessage}</Message></Response>`,
      { headers: { "Content-Type": "application/xml" }, status: 500 }
    );
  }
}
