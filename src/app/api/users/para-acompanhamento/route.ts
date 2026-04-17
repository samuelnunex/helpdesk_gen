import { NextResponse } from "next/server";

import { asc, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/** Lista usuários ativos para escolher acompanhadores (autenticado). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const lista = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.status, "ativo"))
    .orderBy(asc(users.name));

  return NextResponse.json({ users: lista });
}
