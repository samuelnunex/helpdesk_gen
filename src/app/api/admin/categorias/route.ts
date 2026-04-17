import { NextResponse } from "next/server";

import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { categorias, users } from "@/lib/db/schema";

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
  responsavelPadraoId: z.string().uuid(),
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
        responsavelNome: users.name,
      })
      .from(categorias)
      .leftJoin(users, eq(categorias.responsavelPadraoId, users.id))
      .orderBy(asc(categorias.nome));

    return NextResponse.json({ categorias: lista });
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

    const [resp] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, parsed.data.responsavelPadraoId))
      .limit(1);
    if (!resp) {
      return NextResponse.json({ error: "Responsável não encontrado." }, { status: 404 });
    }

    const [created] = await db
      .insert(categorias)
      .values({
        nome: parsed.data.nome,
        responsavelPadraoId: parsed.data.responsavelPadraoId,
        ativo: true,
      })
      .returning();

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
