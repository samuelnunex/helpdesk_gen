import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";
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

const PatchSchema = z.object({
  nome: z.string().min(1).max(120).trim().optional(),
  responsavelPadraoId: z.string().uuid().optional(),
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

    if (parsed.data.responsavelPadraoId !== undefined) {
      const [resp] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, parsed.data.responsavelPadraoId))
        .limit(1);
      if (!resp) return NextResponse.json({ error: "Responsável não encontrado." }, { status: 404 });
    }

    const updates: Partial<typeof categorias.$inferInsert> = { atualizadoEm: new Date() };
    if (parsed.data.nome !== undefined) updates.nome = parsed.data.nome;
    if (parsed.data.responsavelPadraoId !== undefined) updates.responsavelPadraoId = parsed.data.responsavelPadraoId;
    if (parsed.data.ativo !== undefined) updates.ativo = parsed.data.ativo;

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
