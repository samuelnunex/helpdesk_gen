import { NextResponse } from "next/server";

import { asc, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { db } from "@/lib/db";
import { categorias } from "@/lib/db/schema";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const lista = await db
      .select({
        id: categorias.id,
        nome: categorias.nome,
        responsavelPadraoId: categorias.responsavelPadraoId,
      })
      .from(categorias)
      .where(eq(categorias.ativo, true))
      .orderBy(asc(categorias.nome));

    return NextResponse.json({ categorias: lista });
  } catch (err) {
    console.error("Categorias GET error:", err);
    return NextResponse.json({ error: "Erro ao listar categorias." }, { status: 500 });
  }
}
