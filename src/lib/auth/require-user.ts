import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { and, eq, gt } from "drizzle-orm";

import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { sessoes, users } from "@/lib/db/schema";

export type AuthUser = {
  id: string;
  sid: string | undefined;
};

/** Retorna o usuário autenticado ou uma NextResponse de erro. Use em API routes. */
export async function requireUser(): Promise<{ id: string; sid: string | undefined } | NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  if (payload.sid) {
    const [sessao] = await db
      .select()
      .from(sessoes)
      .where(and(eq(sessoes.id, payload.sid), gt(sessoes.expiraEm, new Date())))
      .limit(1);
    if (!sessao) {
      return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
    }
  }

  return { id: payload.sub, sid: payload.sid };
}
