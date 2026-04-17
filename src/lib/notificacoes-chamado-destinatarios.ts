import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { chamadoAcompanhadores, chamados, users } from "@/lib/db/schema";

/** Técnicos de TI ativos — recebem todas as notificações ligadas a chamados. */
export async function idsUsuariosTIAtivos(): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.tipoConta, "ti"), eq(users.status, "ativo")));
  return rows.map((r) => r.id);
}

/**
 * Destinatários “padrão” de um chamado: criador, responsável atual, acompanhadores
 * e todos os técnicos TI ativos. Útil para comentários, mudanças de status etc.
 */
export async function destinatariosNotificacaoChamado(
  chamadoId: string,
  options: {
    excluirUsuarioId?: string;
    /** Incluir IDs que já não entram no estado atual (ex.: ex-responsável após desatribuir). */
    incluirUsuarioIds?: string[];
  } = {},
): Promise<string[]> {
  const [row] = await db
    .select({
      criadorId: chamados.criadorId,
      atribuidoA: chamados.atribuidoA,
    })
    .from(chamados)
    .where(eq(chamados.id, chamadoId))
    .limit(1);

  const acompanhadores = row
    ? await db
        .select({ usuarioId: chamadoAcompanhadores.usuarioId })
        .from(chamadoAcompanhadores)
        .where(eq(chamadoAcompanhadores.chamadoId, chamadoId))
    : [];

  const ti = await idsUsuariosTIAtivos();

  const set = new Set<string>();
  for (const id of options.incluirUsuarioIds ?? []) {
    if (id) set.add(id);
  }
  if (row) {
    set.add(row.criadorId);
    if (row.atribuidoA) set.add(row.atribuidoA);
  }
  for (const a of acompanhadores) {
    set.add(a.usuarioId);
  }
  for (const id of ti) {
    set.add(id);
  }
  if (options.excluirUsuarioId) {
    set.delete(options.excluirUsuarioId);
  }
  return [...set];
}
