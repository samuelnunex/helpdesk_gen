import { and, eq } from "drizzle-orm";

import type { CurrentUser } from "@/lib/auth/get-current-user";
import { canAtribuirChamado } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { chamadoAcompanhadores, chamados, setores } from "@/lib/db/schema";

export async function getChamadoSeUsuarioTemAcesso(
  chamadoId: string,
  user: CurrentUser,
): Promise<typeof chamados.$inferSelect | null> {
  const [chamado] = await db.select().from(chamados).where(eq(chamados.id, chamadoId)).limit(1);
  if (!chamado) return null;

  if (["admin", "diretor", "ti", "desenvolvedor"].includes(user.tipoConta)) return chamado;

  if (user.tipoConta === "gestor_setor") {
    const [setor] = await db
      .select({ gestorId: setores.gestorId })
      .from(setores)
      .where(eq(setores.id, chamado.setorId))
      .limit(1);
    if (setor?.gestorId === user.id) return chamado;
    return null;
  }

  if (chamado.criadorId === user.id) return chamado;
  if (chamado.atribuidoA === user.id) return chamado;

  const [acomp] = await db
    .select()
    .from(chamadoAcompanhadores)
    .where(and(eq(chamadoAcompanhadores.chamadoId, chamadoId), eq(chamadoAcompanhadores.usuarioId, user.id)))
    .limit(1);
  if (acomp) return chamado;

  return null;
}

/** Incluir outro usuário como acompanhador (não a si mesmo). */
export function podeConvidarOutroAcompanhador(user: CurrentUser, chamado: { criadorId: string }): boolean {
  return chamado.criadorId === user.id || canAtribuirChamado(user);
}

/** Remover acompanhador ou a si da lista. */
export function podeRemoverAcompanhador(
  user: CurrentUser,
  chamado: { criadorId: string },
  acompanhadorUsuarioId: string,
): boolean {
  if (acompanhadorUsuarioId === user.id) return true;
  return chamado.criadorId === user.id || canAtribuirChamado(user);
}
