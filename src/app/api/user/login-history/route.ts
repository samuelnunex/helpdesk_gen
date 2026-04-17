import { NextResponse } from "next/server";

import { desc, eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { historicoLogin } from "@/lib/db/schema";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    const list = await db
      .select({
        id: historicoLogin.id,
        ip: historicoLogin.ip,
        userAgent: historicoLogin.userAgent,
        createdAt: historicoLogin.createdAt,
      })
      .from(historicoLogin)
      .where(eq(historicoLogin.usuarioId, auth.id))
      .orderBy(desc(historicoLogin.createdAt))
      .limit(limit);

    return NextResponse.json({
      history: list.map((r) => ({
        id: r.id,
        ip: r.ip,
        userAgent: r.userAgent,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("Login history error:", err);
    return NextResponse.json({ error: "Erro ao carregar histórico." }, { status: 500 });
  }
}
