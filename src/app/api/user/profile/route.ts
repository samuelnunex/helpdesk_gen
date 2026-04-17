import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const BodySchema = z.object({
  name: z.string().min(0).max(200).optional(),
  username: z
    .string()
    .min(2, "Username deve ter pelo menos 2 caracteres.")
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, "Apenas letras, números e _.")
    .optional()
    .nullable(),
  bio: z.string().max(500).optional().nullable(),
});

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
    }

    const update: { name?: string | null; username?: string | null; bio?: string | null } = {};
    if (parsed.data.name !== undefined) update.name = parsed.data.name?.trim() || null;
    if (parsed.data.username !== undefined) update.username = parsed.data.username;
    if (parsed.data.bio !== undefined) update.bio = parsed.data.bio;

    if (update.username !== undefined && update.username !== null) {
      const taken = await db.query.users.findFirst({
        where: (u, { eq: eqOp }) => eqOp(u.username, update.username!),
      });
      if (taken && taken.id !== auth.id) {
        return NextResponse.json({ error: "Username já está em uso." }, { status: 409 });
      }
    }

    const [user] = await db
      .update(users)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(users.id, auth.id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        username: users.username,
        bio: users.bio,
        tipoConta: users.tipoConta,
        status: users.status,
        createdAt: users.createdAt,
      });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      user: { ...user, createdAt: user.createdAt.toISOString() },
    });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "Erro ao atualizar perfil." }, { status: 500 });
  }
}
