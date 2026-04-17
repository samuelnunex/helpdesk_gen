import { NextResponse } from "next/server";

import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { categorias, usuarioCategorias, users } from "@/lib/db/schema";

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

const PatchBodySchema = z.object({
  name: z.string().max(200).optional().nullable(),
  tipoConta: z
    .enum(["admin", "usuario_final", "gestor_setor", "diretor", "ti", "desenvolvedor"])
    .optional(),
  status: z.enum(["ativo", "inativo", "verificado", "pendente"]).optional(),
  password: z.string().min(6).optional(),
  categoriasIds: z.array(z.string().uuid()).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = PatchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.categoriasIds !== undefined) {
      const ids = [...new Set(parsed.data.categoriasIds)];
      if (ids.length > 0) {
        const rows = await db.select({ id: categorias.id }).from(categorias).where(inArray(categorias.id, ids));
        if (rows.length !== ids.length) {
          return NextResponse.json({ error: "Uma ou mais categorias são inválidas." }, { status: 400 });
        }
      }
    }

    const updates: Partial<{
      name: string | null;
      tipoConta: "admin" | "usuario_final" | "gestor_setor" | "diretor" | "ti" | "desenvolvedor";
      status: "ativo" | "inativo" | "verificado" | "pendente";
      passwordHash: string;
      updatedAt: Date;
    }> = { updatedAt: new Date() };

    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.tipoConta !== undefined) updates.tipoConta = parsed.data.tipoConta;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.password !== undefined) {
      updates.passwordHash = await hashPassword(parsed.data.password);
    }

    await db.update(users).set(updates).where(eq(users.id, id));

    if (parsed.data.categoriasIds !== undefined) {
      const ids = [...new Set(parsed.data.categoriasIds)];
      await db.delete(usuarioCategorias).where(eq(usuarioCategorias.usuarioId, id));
      if (ids.length > 0) {
        await db.insert(usuarioCategorias).values(ids.map((categoriaId) => ({ usuarioId: id, categoriaId })));
      }
    }

    return NextResponse.json({ message: "Usuário atualizado." });
  } catch (err) {
    console.error("Admin users PATCH error:", err);
    return NextResponse.json({ error: "Erro ao atualizar usuário." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  if (id === auth.id) {
    return NextResponse.json({ error: "Você não pode excluir a própria conta." }, { status: 400 });
  }

  try {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    await db.delete(users).where(eq(users.id, id));
    return NextResponse.json({ message: "Usuário excluído." });
  } catch (err) {
    console.error("Admin users DELETE error:", err);
    return NextResponse.json({ error: "Erro ao excluir usuário." }, { status: 500 });
  }
}
