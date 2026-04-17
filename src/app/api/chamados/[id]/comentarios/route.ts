import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { touchChamadoAtualizado } from "@/lib/chamados/touch-chamado";
import { db } from "@/lib/db";
import { chamadoComentarios, chamados, users } from "@/lib/db/schema";
import { plainTextLengthComentario, sanitizeComentarioHtml } from "@/lib/html/sanitize-comentario-html";
import { criarNotificacoes } from "@/lib/notificacoes";
import { destinatariosNotificacaoChamado } from "@/lib/notificacoes-chamado-destinatarios";

const MAX_HTML = 24_000;
const MAX_TEXTO_VISIVEL = 8000;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id: chamadoId } = await params;

  const [chamado] = await db
    .select({
      id: chamados.id,
      numero: chamados.numero,
      titulo: chamados.titulo,
      criadorId: chamados.criadorId,
      atribuidoA: chamados.atribuidoA,
      slaPrimeiraRespostaEm: chamados.slaPrimeiraRespostaEm,
    })
    .from(chamados)
    .where(eq(chamados.id, chamadoId))
    .limit(1);
  if (!chamado) return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });

  const body = await request.json();
  const rawConteudo = typeof body?.conteudo === "string" ? body.conteudo : "";
  if (rawConteudo.length > MAX_HTML) {
    return NextResponse.json({ error: `Comentário demasiado longo (máx. ${MAX_HTML} caracteres HTML).` }, { status: 400 });
  }

  const conteudo = sanitizeComentarioHtml(rawConteudo);
  const lenVisivel = plainTextLengthComentario(conteudo);
  if (lenVisivel < 1) {
    return NextResponse.json({ error: "Comentário vazio." }, { status: 400 });
  }
  if (lenVisivel > MAX_TEXTO_VISIVEL) {
    return NextResponse.json(
      { error: `Comentário demasiado longo (máx. ${MAX_TEXTO_VISIVEL} caracteres de texto).` },
      { status: 400 },
    );
  }

  const [comentario] = await db
    .insert(chamadoComentarios)
    .values({ chamadoId, autorId: user.id, conteudo })
    .returning();

  if (!chamado.slaPrimeiraRespostaEm && user.id === chamado.atribuidoA) {
    await db
      .update(chamados)
      .set({ slaPrimeiraRespostaEm: new Date(), atualizadoEm: new Date() })
      .where(eq(chamados.id, chamadoId));
  }

  const notifIds = await destinatariosNotificacaoChamado(chamadoId, {
    excluirUsuarioId: user.id,
  });

  if (notifIds.length > 0) {
    await criarNotificacoes(
      notifIds,
      "comentario",
      `Foi adicionada uma resposta no chamado nº ${chamado.numero}.`,
      chamadoId,
    );
  }

  await touchChamadoAtualizado(chamadoId);

  const autor = { id: user.id, name: user.name, fotoPerfil: user.fotoPerfil };
  return NextResponse.json({ comentario: { ...comentario, autor } }, { status: 201 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id: chamadoId } = await params;

  const comentarios = await db
    .select({
      id: chamadoComentarios.id,
      conteudo: chamadoComentarios.conteudo,
      criadoEm: chamadoComentarios.criadoEm,
      atualizadoEm: chamadoComentarios.atualizadoEm,
      autorId: chamadoComentarios.autorId,
      autorNome: users.name,
      autorFoto: users.fotoPerfil,
    })
    .from(chamadoComentarios)
    .innerJoin(users, eq(chamadoComentarios.autorId, users.id))
    .where(eq(chamadoComentarios.chamadoId, chamadoId))
    .orderBy(chamadoComentarios.criadoEm);

  return NextResponse.json({ comentarios });
}
