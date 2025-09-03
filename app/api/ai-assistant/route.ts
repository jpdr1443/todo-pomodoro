import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

interface Task {
  id: number;
  title: string;
  notes: string;
  pomodoros: number;
  completed: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: { message: string; user_phone?: string } = await request.json();
    
    if (!body.message?.trim()) {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 });
    }

    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('completed', { ascending: true });

    const tasks: Task[] = data as Task[] || [];
    const response = await processMessage(body.message, tasks);

    console.log(`Query from ${body.user_phone || 'unknown'}: ${body.message}`);

    return NextResponse.json({ 
      success: true,
      response,
      tasks_count: tasks.length
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error procesando consulta' }, { status: 500 });
  }
}

async function processMessage(message: string, tasks: Task[]): Promise<string> {
  const lower = message.toLowerCase();
  
  if (lower.includes('ayuda') || lower.includes('help')) {
    return 'Comandos disponibles:\n\n' +
           '- "mis tareas" - Ver todas las tareas\n' +
           '- "pendientes" - Ver tareas por hacer\n' +
           '- "completadas" - Ver tareas terminadas\n' +
           '- "resumen" - Estadisticas';
  }
  
  if (lower.includes('lista') || lower.includes('tareas')) {
    if (tasks.length === 0) {
      return 'No tienes tareas registradas';
    }
    const taskList = tasks.map(task => 
      `- ${task.completed ? 'Completada' : 'Pendiente'}: ${task.title} (${task.pomodoros} pomodoros)`
    ).join('\n');
    return `Tus tareas actuales:\n\n${taskList}`;
  }
  
  if (lower.includes('pendiente') || lower.includes('por hacer')) {
    const pending = tasks.filter(task => !task.completed);
    if (pending.length === 0) {
      return 'No tienes tareas pendientes!';
    }
    const pendingList = pending.map(task => 
      `- ${task.title} (${task.pomodoros} pomodoros)`
    ).join('\n');
    return `Tareas pendientes (${pending.length}):\n\n${pendingList}`;
  }
  
  if (lower.includes('completada') || lower.includes('terminada')) {
    const completed = tasks.filter(task => task.completed);
    if (completed.length === 0) {
      return 'Aun no has completado ninguna tarea';
    }
    const completedList = completed.map(task => `- ${task.title}`).join('\n');
    return `Tareas completadas (${completed.length}):\n\n${completedList}`;
  }
  
  if (lower.includes('resumen') || lower.includes('estadistica')) {
    const completedCount = tasks.filter(t => t.completed).length;
    const pendingCount = tasks.filter(t => !t.completed).length;
    const totalPomodoros = tasks.reduce((sum, task) => sum + task.pomodoros, 0);
    
    return `Resumen de productividad:\n\n` +
           `Total de tareas: ${tasks.length}\n` +
           `Completadas: ${completedCount}\n` +
           `Pendientes: ${pendingCount}\n` +
           `Pomodoros planificados: ${totalPomodoros}`;
  }
  
  return `Recibi: "${message}"\n\nPrueba: "ayuda", "mis tareas", "pendientes"`;
}