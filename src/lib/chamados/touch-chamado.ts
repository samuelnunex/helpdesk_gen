import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { chamados } from "@/lib/db/schema";

/** Atualiza `atualizadoEm` para outros clientes detectarem mudança (SSE / listagem). */
export async function touchChamadoAtualizado(chamadoId: string) {
  await db.update(chamados).set({ atualizadoEm: new Date() }).where(eq(chamados.id, chamadoId));
}
