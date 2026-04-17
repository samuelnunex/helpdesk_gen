import { NextResponse } from "next/server";

import { desc, eq, gt } from "drizzle-orm";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { historicoLogin, sessoes, usuarioCategorias, users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";

async function requireAdmin() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const [u] = await db
    .select({ tipoConta: users.tipoConta })
    .from(users)
    .where(eq(users.id, auth.id))
    .limit(1);
  if (!u || u.tipoConta !== "admin") {
    return NextResponse.json({ error: "Apenas administradores podem acessar." }, { status: 403 });
  }
  return auth;
}

const tipoContaValues = [
  "admin",
  "usuario_final",
  "gestor_setor",
  "diretor",
  "ti",
  "desenvolvedor",
] as const;

const CreateBodySchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "Senha com no mínimo 6 caracteres."),
  name: z.string().max(200).optional(),
  tipoConta: z.enum(tipoContaValues).optional(),
  status: z.enum(["ativo", "inativo", "verificado", "pendente"]).optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        fotoPerfil: users.fotoPerfil,
        tipoConta: users.tipoConta,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    const logins = await db
      .select({ usuarioId: historicoLogin.usuarioId, createdAt: historicoLogin.createdAt })
      .from(historicoLogin)
      .orderBy(desc(historicoLogin.createdAt));

    const lastLoginByUser = new Map<string, Date>();
    for (const row of logins) {
      if (!lastLoginByUser.has(row.usuarioId)) {
        lastLoginByUser.set(row.usuarioId, row.createdAt);
      }
    }

    const now = new Date();
    const activeRows = await db
      .select({ usuarioId: sessoes.usuarioId })
      .from(sessoes)
      .where(gt(sessoes.expiraEm, now));

    const sessionCountByUser = new Map<string, number>();
    for (const row of activeRows) {
      sessionCountByUser.set(row.usuarioId, (sessionCountByUser.get(row.usuarioId) ?? 0) + 1);
    }

    const ucRows = await db
      .select({
        usuarioId: usuarioCategorias.usuarioId,
        categoriaId: usuarioCategorias.categoriaId,
      })
      .from(usuarioCategorias);
    const categoriasPorUsuario = new Map<string, string[]>();
    for (const row of ucRows) {
      const arr = categoriasPorUsuario.get(row.usuarioId) ?? [];
      arr.push(row.categoriaId);
      categoriasPorUsuario.set(row.usuarioId, arr);
    }

    const list = allUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      fotoPerfil: u.fotoPerfil ?? null,
      tipoConta: u.tipoConta,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
      lastLogin: lastLoginByUser.get(u.id)?.toISOString() ?? null,
      activeSessionsCount: sessionCountByUser.get(u.id) ?? 0,
      categoriasIds: categoriasPorUsuario.get(u.id) ?? [],
    }));

    return NextResponse.json({ users: list });
  } catch (err) {
    console.error("Admin users GET error:", err);
    return NextResponse.json({ error: "Erro ao listar usuários." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = CreateBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { email, password, name, tipoConta, status } = parsed.data;

    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email),
      columns: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    await db.insert(users).values({
      email,
      passwordHash,
      name: name ?? null,
      tipoConta: tipoConta ?? "usuario_final",
      status: status ?? "ativo",
    });

    return NextResponse.json({ message: "Usuário criado." });
  } catch (err) {
    console.error("Admin users POST error:", err);
    return NextResponse.json({ error: "Erro ao criar usuário." }, { status: 500 });
  }
}
