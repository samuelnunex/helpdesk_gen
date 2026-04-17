import { NextResponse } from "next/server";

import { desc, eq, gt } from "drizzle-orm";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { sessoes } from "@/lib/db/schema";

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const list = await db
      .select({
        id: sessoes.id,
        userAgent: sessoes.userAgent,
        createdAt: sessoes.createdAt,
        expiraEm: sessoes.expiraEm,
      })
      .from(sessoes)
      .where(eq(sessoes.usuarioId, auth.id))
      .orderBy(desc(sessoes.createdAt));

    const now = new Date();
    const active = list.filter((s) => s.expiraEm > now);

    return NextResponse.json({
      sessions: active.map((s) => ({
        id: s.id,
        userAgent: s.userAgent,
        createdAt: s.createdAt.toISOString(),
        expiraEm: s.expiraEm.toISOString(),
        current: s.id === auth.sid,
      })),
    });
  } catch (err) {
    console.error("Sessions list error:", err);
    return NextResponse.json({ error: "Erro ao carregar sessões." }, { status: 500 });
  }
}
