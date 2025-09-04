import { createClient } from "@supabase/supabase-js";
import Groq from 'groq-sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Inicializar Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

interface Task {
  id: number;
  title: string;
  status: string;
  created_at: string;
}

export async function processMessage(message: string): Promise<string> {
  console.log("DEBUG: processMessage called with:", message);
  const lowerMessage = message.toLowerCase().trim();
  console.log("DEBUG: lowerMessage:", lowerMessage);
  
  try {
    // Obtener tareas actuales del usuario
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    const userTasks: Task[] = (tasks as Task[]) || [];
    console.log("DEBUG: userTasks count:", userTasks.length);

    // 1. Comandos básicos de tareas
    if (lowerMessage.includes('hola') || lowerMessage.includes('hello')) {
      console.log("DEBUG: Matched hello command");
      return `Hola! Soy tu asistente de productividad Pomodoro.

Comandos disponibles:
• "mis tareas" - Ver todas tus tareas
• "pendientes" - Ver tareas por hacer
• "completadas" - Ver tareas terminadas
• "agregar: [título]" - Crear nueva tarea
• "completar: [número]" - Marcar tarea como completada

Para consultas generales, solo pregunta como: "¿cómo preparar café?"`;
    }

    // 2. Ver todas las tareas
    if (lowerMessage.includes('mis tareas') || lowerMessage.includes('tareas')) {
      console.log("DEBUG: Matched tareas command");
      if (userTasks.length === 0) {
        return 'No tienes tareas registradas. Puedes crear una nueva enviando: "agregar: [título de la tarea]"';
      }
      
      const tasksList = userTasks.map((task, index) => 
        `${index + 1}. ${task.status === 'completada' ? '✅' : '⏳'} ${task.title}`
      ).join('\n');
      
      return `Tus tareas actuales:\n\n${tasksList}`;
    }

    // 3. Ver tareas pendientes
    if (lowerMessage.includes('pendiente')) {
      console.log("DEBUG: Matched pendientes command");
      const pendingTasks = userTasks.filter(task => task.status !== 'completada');
      
      if (pendingTasks.length === 0) {
        return '🎉 ¡Excelente! No tienes tareas pendientes.';
      }
      
      const pendingList = pendingTasks.map((task, index) => 
        `${index + 1}. ⏳ ${task.title}`
      ).join('\n');
      
      return `Tareas pendientes (${pendingTasks.length}):\n\n${pendingList}`;
    }

    // 4. Ver tareas completadas
    if (lowerMessage.includes('completada')) {
      console.log("DEBUG: Matched completadas command");
      const completedTasks = userTasks.filter(task => task.status === 'completada');
      
      if (completedTasks.length === 0) {
        return 'Aún no has completado ninguna tarea. ¡Ánimo, puedes empezar ahora!';
      }
      
      const completedList = completedTasks.map(task => `✅ ${task.title}`).join('\n');
      return `Tareas completadas (${completedTasks.length}):\n\n${completedList}`;
    }

    // 5. Agregar nueva tarea
    if (lowerMessage.startsWith('agregar:')) {
      console.log("DEBUG: Matched agregar command");
      const taskTitle = message.slice(8).trim(); // Quitar "agregar:"
      
      if (!taskTitle) {
        return '❌ Formato incorrecto. Usa: "agregar: título de la tarea"';
      }

      const { error } = await supabase
        .from('tasks')
        .insert([{ title: taskTitle, status: 'pendiente' }]);

      if (error) {
        return '❌ Error al crear la tarea. Intenta de nuevo más tarde.';
      }

      return `✅ Tarea creada: "${taskTitle}"`;
    }

    // 6. Completar tarea por número
    if (lowerMessage.startsWith('completar:')) {
      console.log("DEBUG: Matched completar command");
      const taskNumber = parseInt(message.slice(10).trim()); // Quitar "completar:"
      
      if (isNaN(taskNumber) || taskNumber < 1) {
        return '❌ Formato incorrecto. Usa: "completar: [número de tarea]"';
      }

      const pendingTasks = userTasks.filter(task => task.status !== 'completada');
      const taskToComplete = pendingTasks[taskNumber - 1];

      if (!taskToComplete) {
        return `❌ No encontré la tarea número ${taskNumber}. Verifica tus tareas pendientes.`;
      }

      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completada' })
        .eq('id', taskToComplete.id);

      if (error) {
        return '❌ Error al completar la tarea. Intenta de nuevo más tarde.';
      }

      return `✅ Tarea completada: "${taskToComplete.title}"`;
    }

    // 7. Estadísticas/resumen
    if (lowerMessage.includes('resumen') || lowerMessage.includes('estadistica')) {
      console.log("DEBUG: Matched resumen command");
      const completedCount = userTasks.filter(t => t.status === 'completada').length;
      const pendingCount = userTasks.filter(t => t.status !== 'completada').length;
      
      return `📊 Resumen de productividad:\n\n` +
             `• Total de tareas: ${userTasks.length}\n` +
             `• ✅ Completadas: ${completedCount}\n` +
             `• ⏳ Pendientes: ${pendingCount}`;
    }

    // 8. Ayuda
    if (lowerMessage.includes('ayuda') || lowerMessage.includes('help')) {
      console.log("DEBUG: Matched ayuda command");
      return `🤖 Comandos disponibles:\n\n` +
             `📋 "mis tareas" - Ver todas las tareas\n` +
             `⏳ "pendientes" - Ver tareas por hacer\n` +
             `✅ "completadas" - Ver tareas terminadas\n` +
             `➕ "agregar: [título]" - Crear nueva tarea\n` +
             `✅ "completar: [número]" - Completar tarea\n` +
             `📊 "resumen" - Estadísticas\n` +
             `🤖 Pregunta cualquier cosa: "¿cómo preparar café?"`;
    }

    // 9. Consultas complejas con IA (Groq)
    console.log("DEBUG: No command matched, going to AI with message:", message);
    return await processGroqQuery(message, userTasks);

  } catch (error) {
    console.error('DEBUG: Error en processMessage:', error);
    return 'Error procesando tu mensaje. Intenta de nuevo más tarde.';
  }
}

// Función para procesar consultas complejas con Groq
async function processGroqQuery(message: string, tasks: Task[]): Promise<string> {
  try {
    console.log("DEBUG: processGroqQuery called");
    console.log("DEBUG: GROQ_API_KEY exists:", !!process.env.GROQ_API_KEY);
    console.log("DEBUG: GROQ_API_KEY length:", process.env.GROQ_API_KEY?.length || 0);
    console.log("DEBUG: Message received:", message);
    console.log("DEBUG: Tasks count:", tasks.length);
    
    // Crear contexto de tareas para la IA
    const taskContext = tasks.length > 0 
      ? tasks.map(task => 
          `- ${task.status === 'completada' ? 'Completada' : 'Pendiente'}: ${task.title}`
        ).join('\n')
      : 'El usuario no tiene tareas registradas';

    const systemPrompt = `Eres un asistente de productividad que ayuda con la técnica Pomodoro y responde preguntas generales.

CONTEXTO DE TAREAS DEL USUARIO:
${taskContext}

INSTRUCCIONES:
- Si preguntan sobre sus tareas, usa el contexto proporcionado
- Para preguntas generales (como preparar café, consejos, tutoriales), da respuestas útiles y prácticas
- Para consultas de "cómo hacer algo", proporciona pasos específicos y claros
- Mantén respuestas concisas para WhatsApp (máximo 300 palabras)
- Responde en español`;

    console.log("DEBUG: About to call Groq API");

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      model: "llama-3.1-8b-instant",
      max_tokens: 400,
      temperature: 0.7
    });

    console.log("DEBUG: Groq response received successfully");
    const response = completion.choices[0]?.message?.content || 'No response from Groq';
    console.log("DEBUG: Response content length:", response.length);
    console.log("DEBUG: Response preview:", response.substring(0, 100) + "...");
    
    return response;

  } catch (error) {
    console.error('DEBUG: DETAILED Groq error:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      status: error && typeof error === 'object' && 'status' in error ? error.status : 'No status',
      statusText: error && typeof error === 'object' && 'statusText' in error ? error.statusText : 'No statusText',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
    });
    
    return `Error específico con Groq: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
 }