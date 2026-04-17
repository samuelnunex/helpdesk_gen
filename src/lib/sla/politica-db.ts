import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { slaPoliticas } from "@/lib/db/schema";

export type PrioridadeChamado = "baixa" | "media" | "alta" | "urgente";

type Db = typeof db;

export async function buscarPoliticaSla(
  db: Db,
  categoriaId: string,
  prioridade: PrioridadeChamado,
): Promise<{ metaRespostaMinutos: number; metaResolucaoMinutos: number } | null> {
  const [row] = await db
    .select({
      metaRespostaMinutos: slaPoliticas.metaRespostaMinutos,
      metaResolucaoMinutos: slaPoliticas.metaResolucaoMinutos,
    })
    .from(slaPoliticas)
    .where(and(eq(slaPoliticas.categoriaId, categoriaId), eq(slaPoliticas.prioridade, prioridade)))
    .limit(1);
  return row ?? null;
}
