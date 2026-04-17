import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { setores, users } from "@/lib/db/schema";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  setorId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
    }
    const { email, password, name, setorId } = parsed.data;

    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email),
    });
    if (existing) {
      return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
    }

    const [setor] = await db.select({ id: setores.id }).from(setores).where(eq(setores.id, setorId)).limit(1);
    if (!setor) {
      return NextResponse.json({ error: "Setor inválido." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name: name ?? null,
        setorId,
      })
      .returning({ id: users.id, email: users.email, name: users.name });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      message: "Conta criada. Faça login.",
    });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Erro ao criar conta." }, { status: 500 });
  }
}
