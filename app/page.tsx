"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Trash2, Edit3, Save, X } from "lucide-react";

// 🎯 Define el tipo de tarea actualizado
interface Task {
  id: number;
  title: string;
  notes: string;
  pomodoros: number;
  completed: boolean;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [input, setInput] = useState("");
  const [notes, setNotes] = useState("");
  const [pomodoros, setPomodoros] = useState(1);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editInput, setEditInput] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPomodoros, setEditPomodoros] = useState(1);

  // 🚀 Cargar tareas desde Supabase al inicio
  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("completed", { ascending: true })
        .order("id", { ascending: true });

      if (error) {
        console.error("Error cargando tareas:", error.message);
      } else {
        setTasks(data || []);
      }
    };

    fetchTasks();
  }, []);

  // 🚀 Guardar nueva tarea en Supabase
  const addTask = async () => {
    if (!input.trim()) return;

    const { data, error } = await supabase
      .from("tasks")
      .insert([{ 
        title: input, 
        notes: notes,
        pomodoros, 
        completed: false 
      }])
      .select();

    if (error) {
      console.error("Error agregando tarea:", error.message);
    } else {
      setTasks((prev) => [...prev, ...(data || [])]);
      setInput("");
      setNotes("");
      setPomodoros(1);
      setShowForm(false);
    }
  };

  // 🚀 Cambiar estado de tarea
  const toggleTask = async (id: number, completed: boolean) => {
    const { error } = await supabase
      .from("tasks")
      .update({ completed: !completed })
      .eq("id", id);

    if (error) {
      console.error("Error actualizando tarea:", error.message);
    } else {
      setTasks((prev) =>
        [...prev]
          .map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t
          )
          .sort((a, b) => Number(a.completed) - Number(b.completed))
      );
    }
  };

  // 🗑️ Eliminar tarea
  const deleteTask = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta tarea?")) {
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error eliminando tarea:", error.message);
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // ✏️ Iniciar edición
  const startEditing = (task: Task) => {
    setEditingTask(task.id);
    setEditInput(task.title);
    setEditNotes(task.notes || "");
    setEditPomodoros(task.pomodoros);
  };

  // 💾 Guardar edición
  const saveEdit = async () => {
    if (!editInput.trim() || !editingTask) return;

    const { error } = await supabase
      .from("tasks")
      .update({ 
        title: editInput,
        notes: editNotes,
        pomodoros: editPomodoros
      })
      .eq("id", editingTask);

    if (error) {
      console.error("Error editando tarea:", error.message);
    } else {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask 
            ? { ...t, title: editInput, notes: editNotes, pomodoros: editPomodoros }
            : t
        )
      );
      cancelEdit();
    }
  };

  // ❌ Cancelar edición
  const cancelEdit = () => {
    setEditingTask(null);
    setEditInput("");
    setEditNotes("");
    setEditPomodoros(1);
  };

  return (
    <main className="min-h-screen bg-red-800 flex flex-col items-center py-10 text-white">
      <h1 className="text-2xl font-bold mb-6">Pomodoro To-Do</h1>

      {/* Lista de tareas */}
      <div className="w-full max-w-md space-y-2 mb-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`bg-white text-black rounded-lg overflow-hidden ${
              task.completed ? "opacity-60" : ""
            }`}
          >
            {editingTask === task.id ? (
              // 📝 Modo edición
              <div className="p-4">
                <input
                  type="text"
                  value={editInput}
                  onChange={(e) => setEditInput(e.target.value)}
                  className="w-full mb-2 px-3 py-2 border rounded"
                  placeholder="Título de la tarea"
                />
                
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full mb-2 px-3 py-2 border rounded resize-none"
                  placeholder="Notas (opcional)"
                  rows={2}
                />
                
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-sm">Pomodoros:</label>
                  <input
                    type="number"
                    min={1}
                    value={editPomodoros}
                    onChange={(e) => setEditPomodoros(Number(e.target.value))}
                    className="w-16 px-2 py-1 border rounded"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelEdit}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="Cancelar"
                  >
                    <X size={16} className="text-gray-500" />
                  </button>
                  <button
                    onClick={saveEdit}
                    className="p-2 hover:bg-green-100 rounded transition-colors"
                    title="Guardar"
                  >
                    <Save size={16} className="text-green-600" />
                  </button>
                </div>
              </div>
            ) : (
              // 👁️ Modo vista
              <div className="flex justify-between items-start px-4 py-3">
                <div 
                  onClick={() => toggleTask(task.id, task.completed)}
                  className="cursor-pointer flex-1"
                >
                  <div className={`font-medium ${task.completed ? "line-through" : ""}`}>
                    {task.title}
                  </div>
                  {task.notes && (
                    <div className={`text-sm text-gray-600 mt-1 ${task.completed ? "line-through" : ""}`}>
                      {task.notes}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-sm text-gray-600">
                    {task.completed ? "✓" : `${task.pomodoros} Pom`}
                  </span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(task);
                    }}
                    className="p-1 hover:bg-blue-100 rounded transition-colors"
                    title="Editar tarea"
                  >
                    <Edit3 size={16} className="text-gray-400 hover:text-blue-500" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTask(task.id);
                    }}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                    title="Eliminar tarea"
                  >
                    <Trash2 size={16} className="text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Botón o Formulario */}
      <div className="w-full max-w-md">
        {showForm ? (
          <div className="bg-white text-black p-4 rounded-xl shadow">
            <input
              type="text"
              placeholder="What are you working on?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full mb-3 px-3 py-2 border rounded"
            />

            <textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full mb-3 px-3 py-2 border rounded resize-none"
              rows={2}
            />

            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm">Est Pomodoros:</label>
              <input
                type="number"
                min={1}
                value={pomodoros}
                onChange={(e) => setPomodoros(Number(e.target.value))}
                className="w-16 px-2 py-1 border rounded"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm rounded bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={addTask}
                className="px-4 py-2 text-sm rounded bg-red-600 text-white"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl bg-red-700 hover:bg-red-600 transition"
          >
            <span className="font-medium">+ Add Task</span>
          </button>
        )}
      </div>
    </main>
  );
} 