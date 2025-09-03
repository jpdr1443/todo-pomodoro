import { NextRequest, NextResponse } from "next/server";
import { processMessage } from "@/lib/processMessage";

/**
 * Escapa texto para incluirlo dentro de XML (TwiML).
 */
function escapeXml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function POST(req: NextRequest) {
  try {
    const contentType = (req.headers.get("content-type") || "").toLowerCase();

    // Detectamos si viene desde Twilio (form-urlencoded) o desde un cliente JSON (n8n)
    const isForm = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");

    let message: string | null = null;
    let from: string | null = null;

    if (isForm) {
      // Twilio envía form-urlencoded -> usar formData()
      const fd = await req.formData();
      const bodyVal = fd.get("Body");
      const fromVal = fd.get("From") ?? fd.get("from") ?? fd.get("FromPhone");
      message = typeof bodyVal === "string" ? bodyVal : null;
      from = typeof fromVal === "string" ? fromVal : null;
    } else {
      // JSON (p. ej. n8n enviará application/json)
      const jsonBody: unknown = await req.json();
      if (typeof jsonBody === "object" && jsonBody !== null) {
        const jb = jsonBody as Record<string, unknown>;
        if (typeof jb.message === "string") message = jb.message;
        if (typeof jb.user_phone === "string") from = jb.user_phone;
        // también aceptamos 'Body' por compatibilidad:
        if (!message && typeof jb.Body === "string") message = jb.Body;
      }
    }

    if (!message) {
      const errMsg = "No se recibió un mensaje válido. Enviar { message: string } (JSON) o campo Body (form).";
      if (isForm) {
        // Responder TwiML
        return new NextResponse(`<Response><Message>${escapeXml(errMsg)}</Message></Response>`, {
          headers: { "Content-Type": "application/xml" },
          status: 400,
        });
      }
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    console.log("ai-assistant <-", { from, message: message.slice(0, 200) });

    // Llama a tu lógica central (processMessage)
    // Nota: processMessage debe ser async y devolver string
    const reply = await processMessage(message);

    // Si la petición venía de Twilio (directa), respondemos TwiML.
    if (isForm) {
      return new NextResponse(`<Response><Message>${escapeXml(reply)}</Message></Response>`, {
        headers: { "Content-Type": "application/xml" },
      });
    }

    // En caso JSON (n8n), devolvemos JSON con la propiedad 'reply'
    return NextResponse.json({ reply });
  } catch (err) {
    const messageErr = err instanceof Error ? err.message : "Error desconocido";
    console.error("ai-assistant error:", messageErr);
    // Si falla, siempre devolver JSON 500 (n8n) — si quieres TwiML en Twilio, n8n maneja la entrega.
    return NextResponse.json({ error: "Error procesando la solicitud", details: messageErr }, { status: 500 });
  }
}
