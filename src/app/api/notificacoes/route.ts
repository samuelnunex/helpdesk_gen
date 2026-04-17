import { NextResponse } from "next/server";

import { and, count, desc, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { db } from "@/lib/db";
import { notificacoes } from "@/lib/db/schema";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const apenasNaoLidas = searchParams.get("naoLidas") === "true";
  const limitRaw = Number(searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, Math.floor(limitRaw))) : 50;
  const offsetRaw = Number(searchParams.get("offset") ?? 0);
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

  const conditions = [eq(notificacoes.usuarioId, user.id)];
  if (apenasNaoLidas) conditions.push(eq(notificacoes.lida, false));

  const [totalRow] = await db
    .select({ total: count() })
    .from(notificacoes)
    .where(and(...conditions));

  const lista = await db
    .select()
    .from(notificacoes)
    .where(and(...conditions))
    .orderBy(desc(notificacoes.criadoEm))
    .limit(limit)
    .offset(offset);

  const naoLidasCount = await db
    .select({ id: notificacoes.id })
    .from(notificacoes)
    .where(and(eq(notificacoes.usuarioId, user.id), eq(notificacoes.lida, false)));

  return NextResponse.json({
    notificacoes: lista,
    naoLidasCount: naoLidasCount.length,
    total: Number(totalRow?.total ?? 0),
    limit,
    offset,
  });
}
