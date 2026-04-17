import { NextResponse } from "next/server";

import { and, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getChamadoSeUsuarioTemAcesso, podeRemoverAcompanhador } from "@/lib/chamados/acesso-chamado";
import { touchChamadoAtualizado } from "@/lib/chamados/touch-chamado";
import { db } from "@/lib/db";
import { chamadoAcompanhadores } from "@/lib/db/schema";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; usuarioId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id: chamadoId, usuarioId } = await params;

  const chamado = await getChamadoSeUsuarioTemAcesso(chamadoId, user);
  if (!chamado) return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });

  if (!podeRemoverAcompanhador(user, chamado, usuarioId)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const removidos = await db
    .delete(chamadoAcompanhadores)
    .where(and(eq(chamadoAcompanhadores.chamadoId, chamadoId), eq(chamadoAcompanhadores.usuarioId, usuarioId)))
    .returning({ id: chamadoAcompanhadores.id });

  if (removidos.length === 0) {
    return NextResponse.json({ error: "Acompanhador não encontrado." }, { status: 404 });
  }

  await touchChamadoAtualizado(chamadoId);

  return NextResponse.json({ ok: true });
}
