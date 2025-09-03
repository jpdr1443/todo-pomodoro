import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import Groq from 'groq-sdk';

interface Task {
  id: number;
  title: string;
  notes: string;
  pomodoros: number;
  completed: boolean;
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

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
  
  if (lower.includes('ayuda')) {
    return 'Comandos: "mis tareas", "pendientes", "completadas", "resumen"';
  }
  
  if (lower.includes('tareas')) {
    if (tasks.length === 0) return 'No tienes tareas';
    return `Tienes ${tasks.length} tareas: ${tasks.map(t => t.title).join(', ')}`;
  }
  
  return `Recibí: "${message}"`;
}