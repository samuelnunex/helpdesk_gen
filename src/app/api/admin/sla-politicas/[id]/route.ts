import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { slaPoliticas, users } from "@/lib/db/schema";

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

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  try {
    const [existing] = await db.select({ id: slaPoliticas.id }).from(slaPoliticas).where(eq(slaPoliticas.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Política não encontrada." }, { status: 404 });

    await db.delete(slaPoliticas).where(eq(slaPoliticas.id, id));
    return NextResponse.json({ message: "Política removida." });
  } catch (err) {
    console.error("Admin SLA DELETE error:", err);
    return NextResponse.json({ error: "Erro ao remover política." }, { status: 500 });
  }
}
