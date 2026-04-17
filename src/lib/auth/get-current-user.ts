import { cookies } from "next/headers";

import { and, eq, gt } from "drizzle-orm";

import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { sessoes, users } from "@/lib/db/schema";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  fotoPerfil: string | null;
  setorId: string;
  tipoConta:
    | "admin"
    | "usuario_final"
    | "gestor_setor"
    | "diretor"
    | "ti"
    | "desenvolvedor"
    | "usuario"
    | "gestor";
  status: "ativo" | "inativo" | "verificado" | "pendente";
  notifEmail: boolean;
  notifPush: boolean;
  notifSms: boolean;
  createdAt: Date;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  if (payload.sid) {
    const [sessao] = await db
      .select()
      .from(sessoes)
      .where(and(eq(sessoes.id, payload.sid), gt(sessoes.expiraEm, new Date())))
      .limit(1);
    if (!sessao) return null;
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      username: users.username,
      bio: users.bio,
      fotoPerfil: users.fotoPerfil,
      setorId: users.setorId,
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

  return user ?? null;
}
