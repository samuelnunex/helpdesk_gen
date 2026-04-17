import { and, gt } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { scopeListaChamadosParaUsuario } from "@/lib/chamados/scope-lista-para-usuario";
import { db } from "@/lib/db";
import { chamados } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Não autorizado.", { status: 401 });
  }

  const scope = await scopeListaChamadosParaUsuario(user);

  const encoder = new TextEncoder();
  let lastCheck = new Date();
  let keepAliveTimer: ReturnType<typeof setInterval>;
  let pollTimer: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // controller closed
        }
      };

      send(JSON.stringify({ type: "connected" }));

      pollTimer = setInterval(async () => {
        try {
          if (scope.kind === "nenhum") {
            return;
          }

          const baseWhere = scope.kind === "todos" ? undefined : scope.where;
          const mutationWhere = baseWhere
            ? and(baseWhere, gt(chamados.atualizadoEm, lastCheck))
            : gt(chamados.atualizadoEm, lastCheck);

          const rows = await db
            .select({ id: chamados.id, atualizadoEm: chamados.atualizadoEm })
            .from(chamados)
            .where(mutationWhere)
            .limit(80);

          if (rows.length === 0) {
            return;
          }

          let maxEm = rows[0]!.atualizadoEm;
          for (const r of rows) {
            if (r.atualizadoEm > maxEm) maxEm = r.atualizadoEm;
          }
          lastCheck = maxEm;

          const chamadoIds = [...new Set(rows.map((r) => r.id))];
          send(JSON.stringify({ type: "mutacao", chamadoIds }));
        } catch {
          clearInterval(pollTimer);
          clearInterval(keepAliveTimer);
        }
      }, 2500);

      keepAliveTimer = setInterval(() => {
        send(JSON.stringify({ type: "ping" }));
      }, 25000);
    },

    cancel() {
      clearInterval(pollTimer);
      clearInterval(keepAliveTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
