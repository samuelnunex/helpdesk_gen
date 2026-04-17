import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { setores, users } from "@/lib/db/schema";

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

const PatchSetorSchema = z.object({
  nome: z.string().min(1).max(200).optional(),
  descricao: z.string().max(1000).optional().nullable(),
  gestorId: z.string().uuid().optional().nullable(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const [existing] = await db.select().from(setores).where(eq(setores.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Setor não encontrado." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = PatchSetorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updates: Partial<typeof setores.$inferInsert> = { atualizadoEm: new Date() };
    if (parsed.data.nome !== undefined) updates.nome = parsed.data.nome;
    if (parsed.data.descricao !== undefined) updates.descricao = parsed.data.descricao;
    if (parsed.data.gestorId !== undefined) updates.gestorId = parsed.data.gestorId;

    const [updated] = await db.update(setores).set(updates).where(eq(setores.id, id)).returning();
    return NextResponse.json({ setor: updated });
  } catch (err) {
    console.error("Setores PATCH error:", err);
    return NextResponse.json({ error: "Erro ao atualizar setor." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const [existing] = await db.select().from(setores).where(eq(setores.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Setor não encontrado." }, { status: 404 });
    }

    await db.delete(setores).where(eq(setores.id, id));
    return NextResponse.json({ message: "Setor excluído." });
  } catch (err) {
    console.error("Setores DELETE error:", err);
    return NextResponse.json({ error: "Erro ao excluir setor." }, { status: 500 });
  }
}
