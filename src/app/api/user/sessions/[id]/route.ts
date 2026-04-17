import { NextResponse } from "next/server";

import { and, eq, gt } from "drizzle-orm";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { sessoes } from "@/lib/db/schema";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID da sessão não informado." }, { status: 400 });
  }

  try {
    const [deleted] = await db
      .delete(sessoes)
      .where(and(eq(sessoes.id, id), eq(sessoes.usuarioId, auth.id)))
      .returning({ id: sessoes.id });

    if (!deleted) {
      return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ message: "Sessão encerrada." });
  } catch (err) {
    console.error("Revoke session error:", err);
    return NextResponse.json({ error: "Erro ao encerrar sessão." }, { status: 500 });
  }
}
