import { NextResponse } from "next/server";

import { and, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { db } from "@/lib/db";
import { notificacoes } from "@/lib/db/schema";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  await db
    .update(notificacoes)
    .set({ lida: true })
    .where(and(eq(notificacoes.usuarioId, user.id), eq(notificacoes.lida, false)));

  return NextResponse.json({ message: "Todas as notificações marcadas como lidas." });
}
