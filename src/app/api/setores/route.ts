import { NextResponse } from "next/server";

import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { setores, users } from "@/lib/db/schema";

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

const CreateSetorSchema = z.object({
  nome: z.string().min(1).max(200),
  descricao: z.string().max(1000).optional(),
  gestorId: z.string().uuid().optional().nullable(),
});

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const lista = await db
      .select({
        id: setores.id,
        nome: setores.nome,
        descricao: setores.descricao,
        gestorId: setores.gestorId,
        gestorNome: users.name,
        criadoEm: setores.criadoEm,
      })
      .from(setores)
      .leftJoin(users, eq(setores.gestorId, users.id))
      .orderBy(desc(setores.criadoEm));

    return NextResponse.json({ setores: lista });
  } catch (err) {
    console.error("Setores GET error:", err);
    return NextResponse.json({ error: "Erro ao listar setores." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = CreateSetorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const [setor] = await db
      .insert(setores)
      .values({
        nome: parsed.data.nome,
        descricao: parsed.data.descricao ?? null,
        gestorId: parsed.data.gestorId ?? null,
      })
      .returning();

    return NextResponse.json({ setor }, { status: 201 });
  } catch (err) {
    console.error("Setores POST error:", err);
    return NextResponse.json({ error: "Erro ao criar setor." }, { status: 500 });
  }
}
