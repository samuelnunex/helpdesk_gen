import { NextResponse } from "next/server";

import { eq, inArray } from "drizzle-orm";
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

const PatchSchema = z.object({
  nome: z.string().min(1).max(120).trim().optional(),
  responsaveisIds: z.array(z.string().uuid()).min(1).optional(),
  ativo: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  try {
    const [existing] = await db.select({ id: categorias.id }).from(categorias).where(eq(categorias.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });

    const body = await request.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.responsaveisIds !== undefined) {
      const responsaveisIds = [...new Set(parsed.data.responsaveisIds)];
      const rows =
        responsaveisIds.length === 0
          ? []
          : await db.select({ id: users.id }).from(users).where(inArray(users.id, responsaveisIds));
      if (rows.length !== responsaveisIds.length) {
        return NextResponse.json({ error: "Um ou mais responsáveis são inválidos." }, { status: 400 });
      }
    }

    const updates: Partial<typeof categorias.$inferInsert> = { atualizadoEm: new Date() };
    if (parsed.data.nome !== undefined) updates.nome = parsed.data.nome;
    if (parsed.data.ativo !== undefined) updates.ativo = parsed.data.ativo;
    if (parsed.data.responsaveisIds !== undefined) {
      const responsaveisIds = [...new Set(parsed.data.responsaveisIds)];
      updates.responsavelPadraoId = responsaveisIds[0];
      await db.delete(usuarioCategorias).where(eq(usuarioCategorias.categoriaId, id));
      await db
        .insert(usuarioCategorias)
        .values(responsaveisIds.map((usuarioId) => ({ usuarioId, categoriaId: id })));
    }

    await db.update(categorias).set(updates).where(eq(categorias.id, id));
    return NextResponse.json({ message: "Categoria atualizada." });
  } catch (err: unknown) {
    const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "23505") {
      return NextResponse.json({ error: "Já existe uma categoria com esse nome." }, { status: 409 });
    }
    console.error("Admin categorias PATCH error:", err);
    return NextResponse.json({ error: "Erro ao atualizar categoria." }, { status: 500 });
  }
}
