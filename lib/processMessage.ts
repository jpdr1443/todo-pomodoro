export async function processMessage(body: string): Promise<string> {
  const text = body.trim().toLowerCase();

  if (["hola", "buenas", "hello", "hi"].includes(text)) {
    return `👋 ¡Hola! Soy tu asistente de tareas. 
Puedes escribir:
- "ayuda" para ver los comandos disponibles
- "mis tareas" para ver tus tareas
- "crear tarea preparar café | moler granos | 2" para añadir una tarea`;
  }

  if (text === "ayuda") {
    return `📌 Comandos disponibles:
- "mis tareas" → ver todas tus tareas
- "pendientes" → ver solo tareas pendientes
- "crear tarea titulo | descripcion | prioridad" → añadir una nueva tarea
- "completar tarea <id>" → marcar como completada
- "eliminar tarea <id>" → borrar una tarea`;
  }

  if (text === "mis tareas") {
    // Aquí formateamos mejor la lista de tareas
    const tareas = [
      { id: 1, titulo: "dos carros", estado: "pendiente" },
      { id: 2, titulo: "asas", estado: "✔️" },
      { id: 3, titulo: "dos pizzas", estado: "pendiente" },
    ];

    if (tareas.length === 0) return "✅ No tienes tareas registradas.";

    let lista = "📋 Tus tareas:\n\n";
    tareas.forEach(
      (t) => (lista += `#${t.id}: ${t.titulo} (${t.estado})\n`)
    );
    return lista;
  }

  return `No entendí tu mensaje 😅. Escribe "ayuda" para ver los comandos.`;
 }
