import { db } from "@/lib/db";
import { notificacoes } from "@/lib/db/schema";
import { dispararEmailNotificacoes } from "@/lib/notificacoes-email";

type TipoNotificacao = "atribuicao" | "comentario" | "status_alterado" | "acompanhamento" | "mencao";

export async function criarNotificacao({
  usuarioId,
  tipo,
  mensagem,
  chamadoId,
}: {
  usuarioId: string;
  tipo: TipoNotificacao;
  mensagem: string;
  chamadoId?: string;
}) {
  await db.insert(notificacoes).values({
    usuarioId,
    tipo,
    mensagem,
    chamadoId: chamadoId ?? null,
  });
  void dispararEmailNotificacoes([usuarioId], tipo, mensagem, chamadoId);
}

export async function criarNotificacoes(
  usuarioIds: string[],
  tipo: TipoNotificacao,
  mensagem: string,
  chamadoId?: string,
) {
  if (usuarioIds.length === 0) return;
  await db.insert(notificacoes).values(
    usuarioIds.map((usuarioId) => ({
      usuarioId,
      tipo,
      mensagem,
      chamadoId: chamadoId ?? null,
    })),
  );
  void dispararEmailNotificacoes(usuarioIds, tipo, mensagem, chamadoId);
}
