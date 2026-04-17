import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { and, eq, gt } from "drizzle-orm";

import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { sessoes, users } from "@/lib/db/schema";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  if (payload.sid) {
    const [sessao] = await db
      .select()
      .from(sessoes)
      .where(and(eq(sessoes.id, payload.sid), gt(sessoes.expiraEm, new Date())))
      .limit(1);
    if (!sessao) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      username: users.username,
      bio: users.bio,
      fotoPerfil: users.fotoPerfil,
      tipoConta: users.tipoConta,
      status: users.status,
      notifEmail: users.notifEmail,
      notifPush: users.notifPush,
      notifSms: users.notifSms,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
    },
  });
}
