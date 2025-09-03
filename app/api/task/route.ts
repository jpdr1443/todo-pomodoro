// POST /api/tasks → Crear nueva tarea
export async function POST(req: Request) {
  const body = await req.json();
  const { title, status } = body;

  const { data, error } = await supabase
    .from("tasks")
    .insert([{ title, status: status || "pendiente" }])
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data[0], { status: 201 });
}
