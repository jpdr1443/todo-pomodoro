import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

interface Task {
  id: number;
  title: string;
  notes: string;
  pomodoros: number;
  completed: boolean;
}

interface UpdateTaskBody {
  title?: string;
  notes?: string;
  pomodoros?: number;
  completed?: boolean;
}

// GET - Obtener tarea específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !task) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    return NextResponse.json(task as Task);
  } catch {
    return NextResponse.json({ error: 'Error obteniendo tarea' }, { status: 500 });
  }
}

// PUT - Actualizar tarea
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as UpdateTaskBody;
    const { title, notes, pomodoros, completed } = body;

    const { data: task, error } = await supabase
      .from('tasks')
      .update({ title, notes, pomodoros, completed })
      .eq('id', params.id)
      .select()
      .single();

    if (error || !task) {
      return NextResponse.json({ error: 'Error actualizando tarea' }, { status: 500 });
    }

    return NextResponse.json(task as Task);
  } catch {
    return NextResponse.json({ error: 'Error procesando solicitud' }, { status: 500 });
  }
}

// DELETE - Eliminar tarea
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: 'Error eliminando tarea' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Tarea eliminada exitosamente' });
  } catch {
    return NextResponse.json({ error: 'Error procesando solicitud' }, { status: 500 });
  }
}