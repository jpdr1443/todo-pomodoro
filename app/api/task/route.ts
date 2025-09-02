import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// GET - Obtener todas las tareas
export async function GET() {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .order('completed', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      console.error('Error obteniendo tareas:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      tasks: tasks || [],
      count: tasks?.length || 0
    });

  } catch (error) {
    console.error('Error interno:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST - Crear nueva tarea
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, notes = '', pomodoros = 1 } = body;

    // Validaciones
    if (!title?.trim()) {
      return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });
    }

    if (pomodoros < 1) {
      return NextResponse.json({ error: 'Los pomodoros deben ser al menos 1' }, { status: 400 });
    }

    // Insertar en Supabase
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ 
        title: title.trim(), 
        notes: notes.trim(),
        pomodoros: parseInt(pomodoros),
        completed: false 
      }])
      .select();

    if (error) {
      console.error('Error creando tarea:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      task: data[0],
      message: 'Tarea creada exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error interno:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}