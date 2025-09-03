import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Configuración del cliente de Supabase con las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL y Key son requeridos.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Procesar el mensaje recibido
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ✅ Validación corregida en una sola línea
    if (!body || typeof body !== "object" || !("message" in body)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { message } = body as { message: string };

    // Caso 1: El usuario saluda
    if (["hola", "hello", "hi"].includes(message.toLowerCase())) {
      return NextResponse.json({
        reply: "👋 ¡Hola! Soy tu asistente. Puedes pedirme tus tareas o ayuda.",
      });
    }

    // Caso 2: El usuario pide ver sus tareas
    if (message.toLowerCase().includes("tareas")) {
      const { data, error } = await supabase.from("tasks").select("*");

      if (error) {
        return NextResponse.json(
          { error: "Error al obtener las tareas." },
          { status: 500 }
        );
      }

      if (!data || data.length === 0) {
        return NextResponse.json({
          reply: "📋 No tienes tareas pendientes.",
        });
      }

      const formattedTasks = data
        .map((task) => `• ${task.title} (${task.status})`)
        .join("\n");

      return NextResponse.json({
        reply: `📋 Tus tareas:\n${formattedTasks}`,
      });
    }

    // Caso 3: El usuario hace una pregunta abierta (ej: preparar café)
    return NextResponse.json({
      reply: `🤖 Aún no entiendo esa pregunta: "${message}". Estoy en entrenamiento.`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Error procesando la solicitud" },
      { status: 500 }
    );
  }
}
