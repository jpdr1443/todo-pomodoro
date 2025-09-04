import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Inicializar Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

interface Task {
  id: number;
  title: string;
  status: string;
  created_at: string;
}

export async function processMessage(message: string): Promise<string> {
  const lowerMessage = message.toLowerCase().trim();
  
  try {
    // Obtener tareas actuales del usuario
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    const userTasks: Task[] = (tasks as Task[]) || [];

    // 1. Comandos básicos de tareas
    if (lowerMessage.includes('hola') || lowerMessage.includes('hello')) {
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
      const completedTasks = userTasks.filter(task => task.status === 'completada');
      
      if (completedTasks.length === 0) {
        return 'Aún no has completado ninguna tarea. ¡Ánimo, puedes empezar ahora!';
      }
      
      const completedList = completedTasks.map(task => `✅ ${task.title}`).join('\n');
      return `Tareas completadas (${completedTasks.length}):\n\n${completedList}`;
    }

    // 5. Agregar nueva tarea
    if (lowerMessage.startsWith('agregar:')) {
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
      const completedCount = userTasks.filter(t => t.status === 'completada').length;
      const pendingCount = userTasks.filter(t => t.status !== 'completada').length;
      
      return `📊 Resumen de productividad:\n\n` +
             `• Total de tareas: ${userTasks.length}\n` +
             `• ✅ Completadas: ${completedCount}\n` +
             `• ⏳ Pendientes: ${pendingCount}`;
    }

    // 8. Ayuda
    if (lowerMessage.includes('ayuda') || lowerMessage.includes('help')) {
      return `🤖 Comandos disponibles:\n\n` +
             `📋 "mis tareas" - Ver todas las tareas\n` +
             `⏳ "pendientes" - Ver tareas por hacer\n` +
             `✅ "completadas" - Ver tareas terminadas\n` +
             `➕ "agregar: [título]" - Crear nueva tarea\n` +
             `✅ "completar: [número]" - Completar tarea\n` +
             `📊 "resumen" - Estadísticas\n` +
             `🤖 Pregunta cualquier cosa: "¿cómo preparar café?"`;
    }

    // 9. Consultas complejas con IA (Gemini)
    // Si no es ningún comando específico, usar IA
    return await processGeminiQuery(message, userTasks);

  } catch (error) {
    console.error('Error en processMessage:', error);
    return 'Error procesando tu mensaje. Intenta de nuevo más tarde.';
  }
}

// Función para procesar consultas complejas con Gemini
async function processGeminiQuery(message: string, tasks: Task[]): Promise<string> {
  try {
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
- Incluye tips de productividad cuando sea relevante
- Mantén respuestas concisas para WhatsApp (máximo 300 palabras)
- Usa formato claro con saltos de línea
- Si es una pregunta muy específica sobre un tema, da información general útil
- Responde en español
- Sé directo y práctico

EJEMPLOS DE RESPUESTAS:
- "¿Cómo preparar café?" → Pasos específicos para preparar café
- "¿Cómo ser más productivo?" → Tips de productividad y técnica Pomodoro
- "¿Qué hacer cuando estoy estresado?" → Técnicas de manejo de estrés`;

    const fullPrompt = `${systemPrompt}\n\nPregunta del usuario: ${message}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const geminiResponse = response.text();

    if (!geminiResponse || geminiResponse.trim().length === 0) {
      throw new Error('Respuesta vacía de Gemini');
    }
    
    return geminiResponse;

  } catch (error) {
    console.error('Error con Gemini AI:', error);
    
    // Fallback: respuesta básica sin IA
    return `No pude procesar tu consulta compleja en este momento.

Comandos disponibles:
• "ayuda" - Ver todos los comandos
• "mis tareas" - Ver tus tareas
• "agregar: [título]" - Crear tarea
• "pendientes" - Ver tareas por hacer

Intenta de nuevo más tarde para consultas con IA.`;
  }
}