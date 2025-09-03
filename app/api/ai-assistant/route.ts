import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import Groq from 'groq-sdk';

// Definir interfaces para mejor tipado
interface Task {
  id: number;
  title: string;
  notes: string;
  pomodoros: number;
  completed: boolean;
}

// Inicializar Groq (GRATUITO)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, user_phone } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 });
    }

    // Obtener tareas actuales del usuario
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .order('completed', { ascending: true });

    if (tasksError) {
      console.error('Error obteniendo tareas:', tasksError.message);
    }

    const currentTasks: Task[] = tasks || [];

    // Procesar el mensaje con IA
    const aiResponse = await processAIQuery(message, currentTasks);

    // Log para debugging
    console.log(`AI Query from ${user_phone || 'unknown'}: ${message}`);

    return NextResponse.json({ 
      success: true,
      response: aiResponse,
      tasks_count: currentTasks.length
    });

  } catch (error) {
    console.error('Error en AI assistant:', error);
    return NextResponse.json({ error: 'Error procesando consulta' }, { status: 500 });
  }
}

// Función para procesar consultas con IA
async function processAIQuery(message: string, tasks: Task[]): Promise<string> {
  const lowerMessage = message.toLowerCase();
  
  // Crear contexto de tareas
  const taskContext = tasks.map(task => 
    `- ${task.completed ? '✅' : '⏱️'} ${task.title}${task.notes ? ` (${task.notes})` : ''} - ${task.pomodoros} pomodoros`
  ).join('\n');

  // Detectar si es una consulta de "cómo hacer"
  const isHowToQuery = lowerMessage.includes('como') || lowerMessage.includes('cómo') || 
                      lowerMessage.includes('pasos') || lowerMessage.includes('help') ||
                      lowerMessage.includes('ayuda con') || lowerMessage.includes('explicar');

  // Encontrar tarea relacionada
  let relatedTask: Task | null = null;
  if (isHowToQuery) {
    relatedTask = tasks.find(task => {
      const taskWords = task.title.toLowerCase().split(' ');
      const messageWords = lowerMessage.split(' ');
      return taskWords.some(word => messageWords.includes(word) && word.length > 2);
    }) || null;
  }

  // Usar Groq para consultas complejas o "cómo hacer"
  if (isHowToQuery || lowerMessage.includes('buscar') || lowerMessage.includes('internet')) {
    try {
      const systemPrompt = `Eres un asistente de productividad que ayuda con tareas y técnica Pomodoro. 

CONTEXTO DE TAREAS DEL USUARIO:
${taskContext || 'El usuario no tiene tareas registradas'}

INSTRUCCIONES:
- Si preguntan "cómo hacer" algo relacionado con sus tareas, da pasos específicos y prácticos
- Si es una tarea de su lista, menciona cuántos pomodoros estimó
- Incluye tips de productividad cuando sea relevante
- Si piden buscar algo en internet, da información general útil
- Mantén respuestas concisas para WhatsApp (máximo 300 palabras)
- Usa emojis para hacer más visual
- Formato de WhatsApp: *negritas* para títulos`;

      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        model: "llama3-8b-8192", // Modelo gratuito y rápido
        max_tokens: 500,
        temperature: 0.7
      });

      const aiResponse = completion.choices[0]?.message?.content || 'No pude procesar tu consulta';
      
      // Agregar info de tarea relacionada si existe
      if (relatedTask) {
        return `${aiResponse}\n\n📋 *Tu tarea relacionada:*\n- ${relatedTask.title}${relatedTask.notes ? ` (${relatedTask.notes})` : ''} - ${relatedTask.pomodoros} pomodoros estimados`;
      }
      
      return aiResponse;

    } catch (groqError) {
      console.error('Error con Groq:', groqError);
      // Fallback a respuestas básicas si Groq falla
      return await getBasicResponse(message, tasks, taskContext);
    }
  }

  // Respuestas básicas (sin IA)
  return await getBasicResponse(message, tasks, taskContext);
}

// Respuestas básicas sin IA
async function getBasicResponse(message: string, tasks: Task[], taskContext: string): Promise<string> {
  const lowerMessage = message.toLowerCase();

  // Lista de tareas
  if (lowerMessage.includes('lista') || lowerMessage.includes('tareas') || lowerMessage.includes('task')) {
    if (tasks.length === 0) {
      return '📋 *No tienes tareas registradas*\n\nPuedes crear una nueva enviando:\n"agregar: [título de la tarea]"';
    }
    return `📋 *Tus tareas actuales:*\n\n${taskContext}`;
  }
  
  // Tareas pendientes
  if (lowerMessage.includes('pendiente') || lowerMessage.includes('falta') || lowerMessage.includes('por hacer')) {
    const pendingTasks = tasks.filter(task => !task.completed);
    if (pendingTasks.length === 0) {
      return '🎉 *¡Excelente! No tienes tareas pendientes*';
    }
    const pendingContext = pendingTasks.map(task => 
      `- ⏱️ ${task.title}${task.notes ? ` (${task.notes})` : ''} - ${task.pomodoros} pomodoros`
    ).join('\n');
    return `⏳ *Tareas pendientes (${pendingTasks.length}):*\n\n${pendingContext}`;
  }
  
  // Tareas completadas
  if (lowerMessage.includes('completada') || lowerMessage.includes('terminada') || lowerMessage.includes('hecha')) {
    const completedTasks = tasks.filter(task => task.completed);
    if (completedTasks.length === 0) {
      return '📝 *Aún no has completado ninguna tarea*\n\n¡Ánimo, puedes empezar ahora!';
    }
    const completedContext = completedTasks.map(task => 
      `- ✅ ${task.title}${task.notes ? ` (${task.notes})` : ''}`
    ).join('\n');
    return `✅ *Tareas completadas (${completedTasks.length}):*\n\n${completedContext}`;
  }

  // Estadísticas
  if (lowerMessage.includes('estadistica') || lowerMessage.includes('resumen') || lowerMessage.includes('stats')) {
    const completed = tasks.filter(t => t.completed).length;
    const pending = tasks.filter(t => !t.completed).length;
    const totalPomodoros = tasks.reduce((sum, task) => sum + task.pomodoros, 0);
    const completedPomodoros = tasks.filter(t => t.completed).reduce((sum, task) => sum + task.pomodoros, 0);
    
    return `📊 *Tu resumen de productividad:*\n\n` +
           `• Total de tareas: ${tasks.length}\n` +
           `• ✅ Completadas: ${completed}\n` +
           `• ⏳ Pendientes: ${pending}\n` +
           `• 🍅 Pomodoros planificados: ${totalPomodoros}\n` +
           `• 🎯 Pomodoros completados: ${completedPomodoros}`;
  }

  // Ayuda
  if (lowerMessage.includes('ayuda') || lowerMessage.includes('help') || lowerMessage.includes('comando')) {
    return `🤖 *Comandos disponibles:*\n\n` +
           `📋 "mis tareas" - Ver todas las tareas\n` +
           `⏳ "pendientes" - Ver tareas por hacer\n` +
           `✅ "completadas" - Ver tareas terminadas\n` +
           `📊 "resumen" - Estadísticas\n` +
           `🔍 "buscar: [término]" - Buscar tareas\n` +
           `🤖 "cómo hacer [tarea]" - Explicación con IA\n` +
           `🔍 "buscar internet: [tema]" - Búsqueda web\n` +
           `➕ "agregar: [título]" - Crear nueva tarea\n` +
           `🆘 "ayuda" - Ver comandos`;
  }

  // Detectar comando de agregar tarea
  if (lowerMessage.startsWith('agregar:') || lowerMessage.startsWith('crear:') || lowerMessage.startsWith('nueva:')) {
    const taskTitle = message.split(':')[1]?.trim();
    if (taskTitle) {
      return await addTaskFromWhatsApp(taskTitle);
    }
    return '❌ *Formato incorrecto*\n\nUsa: "agregar: título de la tarea"';
  }

  // Buscar tareas
  if (lowerMessage.startsWith('buscar:')) {
    const searchTerm = message.split(':')[1]?.trim().toLowerCase();
    if (searchTerm) {
      const foundTasks = tasks.filter(task => 
        task.title.toLowerCase().includes(searchTerm) || 
        (task.notes && task.notes.toLowerCase().includes(searchTerm))
      );
      
      if (foundTasks.length === 0) {
        return `🔍 *No encontré tareas con "${searchTerm}"*`;
      }
      
      const foundContext = foundTasks.map(task => 
        `- ${task.completed ? '✅' : '⏱️'} ${task.title}${task.notes ? ` (${task.notes})` : ''} - ${task.pomodoros} pomodoros`
      ).join('\n');
      
      return `🔍 *Encontré ${foundTasks.length} tarea(s) con "${searchTerm}":*\n\n${foundContext}`;
    }
    return '❌ *Formato incorrecto*\n\nUsa: "buscar: término"';
  }

  // Respuesta por defecto
  return `🤖 *Recibí:* "${message}"\n\n` +
         `💡 *Prueba preguntar:*\n` +
         `• "cómo hacer preparar café"\n` +
         `• "buscar internet: recetas café"\n` +
         `• "mis tareas pendientes"\n` +
         `• "agregar: nueva tarea"\n` +
         `• "buscar: café"\n\n` +
         `${taskContext ? `📋 *Tienes ${tasks.length} tareas*` : '📝 *No tienes tareas*'}`;
}

// Función para agregar tareas desde WhatsApp
async function addTaskFromWhatsApp(title: string): Promise<string> {
  try {
    const { error } = await supabase
      .from('tasks')
      .insert([{ 
        title: title, 
        notes: '',
        pomodoros: 1, 
        completed: false 
      }])
      .select();

    if (error) {
      console.error('Error agregando tarea desde WhatsApp:', error.message);
      return '❌ *Error al crear la tarea*\n\nIntenta de nuevo más tarde.';
    }

    return `✅ *Tarea creada exitosamente*\n\n📋 ${title}\n🍅 1 pomodoro estimado\n\n¡Puedes verla en tu app web!`;

  } catch (error) {
    console.error('Error en addTaskFromWhatsApp:', error);
    return '❌ *Error al crear la tarea*\n\nIntenta de nuevo más tarde.';
  }
}