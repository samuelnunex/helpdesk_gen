import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getChamadoSeUsuarioTemAcesso, podeConvidarOutroAcompanhador } from "@/lib/chamados/acesso-chamado";
import { touchChamadoAtualizado } from "@/lib/chamados/touch-chamado";
import { db } from "@/lib/db";
import { chamadoAcompanhadores, users } from "@/lib/db/schema";
import { criarNotificacoes } from "@/lib/notificacoes";
import { idsUsuariosTIAtivos } from "@/lib/notificacoes-chamado-destinatarios";

const AddAcompanhadorSchema = z.object({
  usuarioId: z.string().uuid(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id: chamadoId } = await params;

  const chamadoRow = await getChamadoSeUsuarioTemAcesso(chamadoId, user);
  if (!chamadoRow) return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });

  const body = await request.json();
  const parsed = AddAcompanhadorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  const [targetUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, parsed.data.usuarioId))
    .limit(1);
  if (!targetUser) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  if (parsed.data.usuarioId === chamadoRow.criadorId) {
    return NextResponse.json({ error: "O criador do chamado já acompanha este chamado." }, { status: 400 });
  }

  if (parsed.data.usuarioId !== user.id && !podeConvidarOutroAcompanhador(user, chamadoRow)) {
    return NextResponse.json({ error: "Sem permissão para adicionar acompanhadores." }, { status: 403 });
  }

  try {
    await db.insert(chamadoAcompanhadores).values({
      chamadoId,
      usuarioId: parsed.data.usuarioId,
    });
  } catch {
    return NextResponse.json({ error: "Usuário já é acompanhador." }, { status: 409 });
  }

  if (parsed.data.usuarioId !== user.id) {
    await criarNotificacoes(
      [parsed.data.usuarioId],
      "acompanhamento",
      `Você foi adicionado como acompanhador do chamado "${chamadoRow.titulo}".`,
      chamadoId,
    );
  }

  const tiSemAutor = (await idsUsuariosTIAtivos()).filter((id) => id !== user.id && id !== parsed.data.usuarioId);
  if (tiSemAutor.length > 0) {
    await criarNotificacoes(
      tiSemAutor,
      "acompanhamento",
      `Novo acompanhador no chamado nº ${chamadoRow.numero}.`,
      chamadoId,
    );
  }

  await touchChamadoAtualizado(chamadoId);

  return NextResponse.json({ message: "Acompanhador adicionado." }, { status: 201 });
}
