import { and, eq, inArray, or, type SQL } from "drizzle-orm";

import type { CurrentUser } from "@/lib/auth/get-current-user";
import { canVerTodosChamados } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { chamadoAcompanhadores, chamados, setores } from "@/lib/db/schema";

/** Escopo de chamados visíveis na listagem (mesmas regras de `GET /api/chamados` sem filtros de status/setor). */
export type ScopeListaChamados =
  | { kind: "todos" }
  | { kind: "nenhum" }
  | { kind: "filtro"; where: SQL };

export async function scopeListaChamadosParaUsuario(user: CurrentUser): Promise<ScopeListaChamados> {
  if (canVerTodosChamados(user)) {
    return { kind: "todos" };
  }

  if (user.tipoConta === "gestor_setor") {
    const [setor] = await db.select({ id: setores.id }).from(setores).where(eq(setores.gestorId, user.id)).limit(1);
    if (!setor) return { kind: "nenhum" };
    return { kind: "filtro", where: eq(chamados.setorId, setor.id) };
  }

  const acompanhamentos = await db
    .select({ chamadoId: chamadoAcompanhadores.chamadoId })
    .from(chamadoAcompanhadores)
    .where(eq(chamadoAcompanhadores.usuarioId, user.id));
  const acompanhadoIds = acompanhamentos.map((a) => a.chamadoId);

  if (acompanhadoIds.length === 0) {
    return { kind: "filtro", where: eq(chamados.criadorId, user.id) };
  }

  return {
    kind: "filtro",
    where: or(eq(chamados.criadorId, user.id), inArray(chamados.id, acompanhadoIds))!,
  };
}

/** Junta o escopo base com filtros opcionais da listagem (status, prioridade, setor, busca texto/número). */
export function andComFiltrosLista(
  scope: ScopeListaChamados,
  filtros: {
    status?: SQL;
    prioridade?: SQL;
    setorId?: SQL;
    busca?: SQL;
  },
): SQL | undefined {
  if (scope.kind === "nenhum") return undefined;
  const parts: SQL[] = [];
  if (scope.kind === "filtro") parts.push(scope.where);
  if (filtros.status) parts.push(filtros.status);
  if (filtros.prioridade) parts.push(filtros.prioridade);
  if (filtros.setorId) parts.push(filtros.setorId);
  if (filtros.busca) parts.push(filtros.busca);
  if (parts.length === 0) return undefined;
  return parts.length === 1 ? parts[0] : and(...parts);
}
