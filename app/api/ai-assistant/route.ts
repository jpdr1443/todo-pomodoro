import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 🔑 Tipos para el request
type MessageRequest = {
  message: string;
};

// Inicializar Supabase (usa variables de entorno con NEXT_PUBLIC_)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: Request) {
  try {
    // Parsear y validar el body
    const body: unknown = await req.json();

    if (
      typeof body !== "object" ||
