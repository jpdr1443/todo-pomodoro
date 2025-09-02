"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [input, setInput] = useState("");
  const [pomodoros, setPomodoros] = useState(1);

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
      .insert([{ title: input, pomodoros, completed: false }])
      .select();

    if (error) {
      console.error("Error agregando tarea:", error.message);
    } else {
      setTasks((prev) => [...prev, ...(data || [])]);
      setInput("");
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

  return (
    <main className="min-h-screen bg-red-800 flex flex-col items-center py-10 text-white">
      <h1 className="text-2xl font-bold mb-6">Pomodoro To-Do</h1>

      {/* Lista de tareas */}
      <div className="w-full max-w-md space-y-2 mb-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex justify-between items-center px-4 py-3 rounded bg-white text-black ${
              task.completed ? "opacity-60 line-through" : ""
            }`}
          >
            <span
              onClick={() => toggleTask(task.id, task.completed)}
              className="cursor-pointer"
            >
              {task.title}
            </span>
            <span className="text-sm text-gray-600">
              {task.completed ? "✓" : `${task.pomodoros} Pom`}
            </span>
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
