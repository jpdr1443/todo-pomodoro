import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

interface Task {
  id: number;
  title: string;
  notes: string;
  pomodoros: number;
  completed: boolean;
}

// GET - Obtener tarea específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (!task) {
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: Partial<Task> = await request.json();
    
    const { data: task } = await supabase
      .from('tasks')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (!task) {
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    return NextResponse.json({ message: 'Tarea eliminada' });
  } catch {
    return NextResponse.json({ error: 'Error eliminando tarea' }, { status: 500 });
  }
}