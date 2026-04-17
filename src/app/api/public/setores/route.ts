import { NextResponse } from "next/server";

import { asc } from "drizzle-orm";

import { db } from "@/lib/db";
import { setores } from "@/lib/db/schema";

/** Lista setores para telas públicas (cadastro). */
export async function GET() {
  try {
    const lista = await db
      .select({ id: setores.id, nome: setores.nome })
      .from(setores)
      .orderBy(asc(setores.nome));
    return NextResponse.json({ setores: lista });
  } catch (err) {
    console.error("Public setores GET error:", err);
    return NextResponse.json({ error: "Erro ao listar setores." }, { status: 500 });
  }
}

