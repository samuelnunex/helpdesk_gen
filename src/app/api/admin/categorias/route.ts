import { NextResponse } from "next/server";

import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { categorias, usuarioCategorias, users } from "@/lib/db/schema";

async function requireAdmin() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const [u] = await db
    .select({ tipoConta: users.tipoConta })
    .from(users)
    .where(eq(users.id, auth.id))
    .limit(1);
  if (!u || u.tipoConta !== "admin") {
    return NextResponse.json({ error: "Apenas administradores podem acessar." }, { status: 403 });
  }
  return auth;
}

const PostSchema = z.object({
  nome: z.string().min(1).max(120).trim(),
  responsaveisIds: z.array(z.string().uuid()).min(1, "Selecione ao menos um responsável."),
});

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const lista = await db
      .select({
        id: categorias.id,
        nome: categorias.nome,
        ativo: categorias.ativo,
        responsavelPadraoId: categorias.responsavelPadraoId,
      })
      .from(categorias)
      .orderBy(asc(categorias.nome));

    const categoriaIds = lista.map((c) => c.id);
    const respRows =
      categoriaIds.length === 0
        ? []
        : await db
            .select({
              categoriaId: usuarioCategorias.categoriaId,
              id: users.id,
              name: users.name,
              email: users.email,
            })
            .from(usuarioCategorias)
            .innerJoin(users, eq(usuarioCategorias.usuarioId, users.id))
            .where(inArray(usuarioCategorias.categoriaId, categoriaIds))
            .orderBy(asc(users.name));

    const responsaveisPorCategoria = new Map<string, { id: string; name: string | null; email: string }[]>();
    for (const r of respRows) {
      const arr = responsaveisPorCategoria.get(r.categoriaId) ?? [];
      arr.push({ id: r.id, name: r.name, email: r.email });
      responsaveisPorCategoria.set(r.categoriaId, arr);
    }

    return NextResponse.json({
      categorias: lista.map((c) => {
        const responsaveis = responsaveisPorCategoria.get(c.id) ?? [];
        return {
          ...c,
          responsaveis,
          responsaveisIds: responsaveis.map((r) => r.id),
        };
      }),
    });
  } catch (err) {
    console.error("Admin categorias GET error:", err);
    return NextResponse.json({ error: "Erro ao listar categorias." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
    }

    const responsaveisIds = [...new Set(parsed.data.responsaveisIds)];
    const respRows =
      responsaveisIds.length === 0
        ? []
        : await db.select({ id: users.id }).from(users).where(inArray(users.id, responsaveisIds));
    if (respRows.length !== responsaveisIds.length) {
      return NextResponse.json({ error: "Um ou mais responsáveis são inválidos." }, { status: 400 });
    }
    const responsavelPadraoId = responsaveisIds[0];

    const [created] = await db
      .insert(categorias)
      .values({
        nome: parsed.data.nome,
        responsavelPadraoId,
        ativo: true,
      })
      .returning();

    await db
      .insert(usuarioCategorias)
      .values(responsaveisIds.map((usuarioId) => ({ usuarioId, categoriaId: created.id })));

    return NextResponse.json({ categoria: created }, { status: 201 });
  } catch (err: unknown) {
    const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "23505") {
      return NextResponse.json({ error: "Já existe uma categoria com esse nome." }, { status: 409 });
    }
    console.error("Admin categorias POST error:", err);
    return NextResponse.json({ error: "Erro ao criar categoria." }, { status: 500 });
  }
}
