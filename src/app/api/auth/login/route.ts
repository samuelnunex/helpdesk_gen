import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from "@/lib/auth/cookies";
import { signToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { historicoLogin, sessoes, users } from "@/lib/db/schema";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "E-mail ou senha inválidos.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { email, password } = parsed.data;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
    }

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") ?? undefined;
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headersList.get("x-real-ip") ?? undefined;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const [sessao] = await db
      .insert(sessoes)
      .values({
        usuarioId: user.id,
        userAgent,
        expiraEm: expiresAt,
      })
      .returning({ id: sessoes.id });

    await db.insert(historicoLogin).values({
      usuarioId: user.id,
      ip,
      userAgent,
    });

    const token = await signToken({
      sub: user.id,
      email: user.email,
      sid: sessao?.id,
    });
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        tipoConta: user.tipoConta,
        status: user.status,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Erro ao fazer login." }, { status: 500 });
  }
}
