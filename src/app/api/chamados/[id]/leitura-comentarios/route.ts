import { NextResponse } from "next/server";

import { and, eq, max } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getChamadoSeUsuarioTemAcesso } from "@/lib/chamados/acesso-chamado";
import { db } from "@/lib/db";
import { chamadoComentarios, chamadoLeituraComentarios } from "@/lib/db/schema";

/** Marca comentários do chamado como vistos pelo usuário atual (ex.: ao abrir a página de detalhes). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id: chamadoId } = await params;

  const chamado = await getChamadoSeUsuarioTemAcesso(chamadoId, user);
  if (!chamado) return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });

  const [agg] = await db
    .select({ ultimo: max(chamadoComentarios.criadoEm) })
    .from(chamadoComentarios)
    .where(eq(chamadoComentarios.chamadoId, chamadoId));

  const vistoAte = agg?.ultimo ?? chamado.criadoEm;

  await db
    .delete(chamadoLeituraComentarios)
    .where(and(eq(chamadoLeituraComentarios.chamadoId, chamadoId), eq(chamadoLeituraComentarios.usuarioId, user.id)));

  await db.insert(chamadoLeituraComentarios).values({
    chamadoId,
    usuarioId: user.id,
    vistoAte,
  });

  return NextResponse.json({ ok: true, vistoAte });
}
