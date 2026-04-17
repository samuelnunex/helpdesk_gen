import { NextResponse } from "next/server";

import { writeFile } from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { touchChamadoAtualizado } from "@/lib/chamados/touch-chamado";
import { db } from "@/lib/db";
import { chamadoAnexos, chamados } from "@/lib/db/schema";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id: chamadoId } = await params;

  const [chamado] = await db
    .select({ id: chamados.id })
    .from(chamados)
    .where(eq(chamados.id, chamadoId))
    .limit(1);
  if (!chamado) return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const comentarioId = formData.get("comentarioId") as string | null;

    if (!file) return NextResponse.json({ error: "Arquivo obrigatório." }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Arquivo muito grande. Máximo: 10MB." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de arquivo não permitido." }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "bin";
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "chamados", chamadoId);

    const { mkdir } = await import("node:fs/promises");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, uniqueName), buffer);

    const url = `/api/uploads/chamados/${chamadoId}/${uniqueName}`;

    const [anexo] = await db
      .insert(chamadoAnexos)
      .values({
        chamadoId,
        comentarioId: comentarioId ?? null,
        url,
        nomeArquivo: file.name,
        tipo: file.type,
        tamanho: file.size,
        enviadoPor: user.id,
      })
      .returning();

    await touchChamadoAtualizado(chamadoId);

    return NextResponse.json({ anexo }, { status: 201 });
  } catch (err) {
    console.error("Chamado anexo POST error:", err);
    return NextResponse.json({ error: "Erro ao fazer upload do anexo." }, { status: 500 });
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id: chamadoId } = await params;

  const anexos = await db
    .select()
    .from(chamadoAnexos)
    .where(eq(chamadoAnexos.chamadoId, chamadoId))
    .orderBy(chamadoAnexos.criadoEm);

  return NextResponse.json({ anexos });
}
