import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Formato inválido. Use JPEG, PNG ou WebP." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Imagem muito grande. Máximo 2 MB." }, { status: 400 });
    }

    const ext = EXT[file.type] ?? "jpg";
    const filename = `${auth.id}-${Date.now()}.${ext}`;
    const dir = join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(dir, { recursive: true });
    const filepath = join(dir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const url = `/uploads/avatars/${filename}`;

    const [oldUser] = await db
      .select({ fotoPerfil: users.fotoPerfil })
      .from(users)
      .where(eq(users.id, auth.id))
      .limit(1);

    await db.update(users).set({ fotoPerfil: url, updatedAt: new Date() }).where(eq(users.id, auth.id));

    if (oldUser?.fotoPerfil && oldUser.fotoPerfil.startsWith("/uploads/avatars/") && oldUser.fotoPerfil !== url) {
      const oldPath = join(process.cwd(), "public", oldUser.fotoPerfil);
      await unlink(oldPath).catch(() => undefined);
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("Avatar upload error:", err);
    return NextResponse.json({ error: "Erro ao enviar foto." }, { status: 500 });
  }
}

export async function DELETE() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const [user] = await db.select({ fotoPerfil: users.fotoPerfil }).from(users).where(eq(users.id, auth.id)).limit(1);
    if (user?.fotoPerfil?.startsWith("/uploads/avatars/")) {
      const { unlink } = await import("node:fs/promises");
      const { join } = await import("node:path");
      await unlink(join(process.cwd(), "public", user.fotoPerfil)).catch(() => undefined);
    }
    await db.update(users).set({ fotoPerfil: null, updatedAt: new Date() }).where(eq(users.id, auth.id));
    return NextResponse.json({ message: "Foto removida." });
  } catch (err) {
    console.error("Avatar delete error:", err);
    return NextResponse.json({ error: "Erro ao remover foto." }, { status: 500 });
  }
}
