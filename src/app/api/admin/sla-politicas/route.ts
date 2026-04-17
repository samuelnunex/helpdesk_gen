import { NextResponse } from "next/server";

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { categorias, slaPoliticas, users } from "@/lib/db/schema";

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

const prioridadeEnum = z.enum(["baixa", "media", "alta", "urgente"]);

const UpsertSchema = z.object({
  categoriaId: z.string().uuid(),
  prioridade: prioridadeEnum,
  metaRespostaMinutos: z.coerce.number().int().min(1).max(100_000),
  metaResolucaoMinutos: z.coerce.number().int().min(1).max(100_000),
});

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const lista = await db
      .select({
        id: slaPoliticas.id,
        categoriaId: slaPoliticas.categoriaId,
        categoriaNome: categorias.nome,
        prioridade: slaPoliticas.prioridade,
        metaRespostaMinutos: slaPoliticas.metaRespostaMinutos,
        metaResolucaoMinutos: slaPoliticas.metaResolucaoMinutos,
      })
      .from(slaPoliticas)
      .innerJoin(categorias, eq(slaPoliticas.categoriaId, categorias.id))
      .orderBy(asc(categorias.nome), slaPoliticas.prioridade);

    return NextResponse.json({ politicas: lista });
  } catch (err) {
    console.error("Admin SLA GET error:", err);
    return NextResponse.json({ error: "Erro ao listar políticas de SLA." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = UpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
    }

    const [cat] = await db.select({ id: categorias.id }).from(categorias).where(eq(categorias.id, parsed.data.categoriaId)).limit(1);
    if (!cat) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
    }

    const now = new Date();
    const [existente] = await db
      .select({ id: slaPoliticas.id })
      .from(slaPoliticas)
      .where(and(eq(slaPoliticas.categoriaId, parsed.data.categoriaId), eq(slaPoliticas.prioridade, parsed.data.prioridade)))
      .limit(1);

    let row: typeof slaPoliticas.$inferSelect | undefined;

    if (existente) {
      const [atualizado] = await db
        .update(slaPoliticas)
        .set({
          metaRespostaMinutos: parsed.data.metaRespostaMinutos,
          metaResolucaoMinutos: parsed.data.metaResolucaoMinutos,
          atualizadoEm: now,
        })
        .where(eq(slaPoliticas.id, existente.id))
        .returning();
      row = atualizado;
    } else {
      const [inserido] = await db
        .insert(slaPoliticas)
        .values({
          categoriaId: parsed.data.categoriaId,
          prioridade: parsed.data.prioridade,
          metaRespostaMinutos: parsed.data.metaRespostaMinutos,
          metaResolucaoMinutos: parsed.data.metaResolucaoMinutos,
          criadoEm: now,
          atualizadoEm: now,
        })
        .returning();
      row = inserido;
    }

    return NextResponse.json({ politica: row }, { status: 200 });
  } catch (err) {
    console.error("Admin SLA POST error:", err);
    return NextResponse.json({ error: "Erro ao salvar política de SLA." }, { status: 500 });
  }
}
