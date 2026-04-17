import { NextResponse } from "next/server";

import { asc, eq, inArray } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { db } from "@/lib/db";
import { categorias, usuarioCategorias } from "@/lib/db/schema";

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

    const categoriaIds = lista.map((c) => c.id);
    const ucRows =
      categoriaIds.length === 0
        ? []
        : await db
            .select({
              categoriaId: usuarioCategorias.categoriaId,
              usuarioId: usuarioCategorias.usuarioId,
            })
            .from(usuarioCategorias)
            .where(inArray(usuarioCategorias.categoriaId, categoriaIds));

    const responsaveisIdsPorCategoria = new Map<string, string[]>();
    for (const row of ucRows) {
      const arr = responsaveisIdsPorCategoria.get(row.categoriaId) ?? [];
      arr.push(row.usuarioId);
      responsaveisIdsPorCategoria.set(row.categoriaId, arr);
    }

    return NextResponse.json({
      categorias: lista.map((c) => ({
        ...c,
        responsaveisIds: responsaveisIdsPorCategoria.get(c.id) ?? (c.responsavelPadraoId ? [c.responsavelPadraoId] : []),
      })),
    });
  } catch (err) {
    console.error("Categorias GET error:", err);
    return NextResponse.json({ error: "Erro ao listar categorias." }, { status: 500 });
  }
}
