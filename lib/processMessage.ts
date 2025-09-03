// /lib/processMessage.ts
import { supabase } from "@/lib/supabase"; // importa tu cliente supabase

export async function processMessage(message: string) {
  const lower = message.toLowerCase().trim();

  // Ejemplo: listar
  if (lower === "mis tareas") {
    const { data, error } = await supabase.from("tasks").select("*");
    if (error) return `Error obteniendo tareas: ${error.message}`;
    if (!data || data.length === 0) return "No tienes tareas registradas.";
    return data.map(t => `${t.id} - ${t.title} (${t.completed ? "✔️" : "pendiente"})`).join("\n");
  }

  // Crear tarea
  const createMatch = lower.match(/crear tarea\s+(.+)/i);
  if (createMatch) {
    const parts = createMatch[1].split("|").map(p => p.trim());
    const title = parts[0];
    const notes = parts[1] || "";
    const pomodoros = parts[2] ? Math.max(1, parseInt(parts[2])) : 1;

    const { data, error } = await supabase
      .from("tasks")
      .insert([{ title, notes, pomodoros, completed: false }])
      .select();

    if (error) return `Error creando tarea: ${error.message}`;
    return `Tarea creada: ${data[0].id} - ${data[0].title}`;
  }

  // Completar tarea
  const completeMatch = lower.match(/completar tarea\s+(\d+)/i);
  if (completeMatch) {
    const id = Number(completeMatch[1]);
    const { data, error } = await supabase
      .from("tasks")
      .update({ completed: true })
      .eq("id", id)
      .select();

    if (error) return `Error completando tarea: ${error.message}`;
    if (!data || data.length === 0) return `No encontré tarea con id ${id}`;
    return `Tarea ${id} completada: ${data[0].title}`;
  }

  // Eliminar tarea
  const deleteMatch = lower.match(/eliminar tarea\s+(\d+)/i);
  if (deleteMatch) {
    const id = Number(deleteMatch[1]);
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) return `Error eliminando tarea: ${error.message}`;
    return `Tarea ${id} eliminada.`;
  }

  // Fallback
  return `No entendí tu mensaje. Escribe "ayuda" para ver comandos.`;
}
