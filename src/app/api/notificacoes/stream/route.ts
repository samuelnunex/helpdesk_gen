import { and, desc, eq, gt } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { db } from "@/lib/db";
import { notificacoes } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Não autorizado.", { status: 401 });
  }

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

      // Send initial ping
      send(JSON.stringify({ type: "connected" }));

      // Poll for new notifications every 3 seconds
      pollTimer = setInterval(async () => {
        try {
          const novas = await db
            .select()
            .from(notificacoes)
            .where(
              and(
                eq(notificacoes.usuarioId, user.id),
                eq(notificacoes.lida, false),
                gt(notificacoes.criadoEm, lastCheck),
              ),
            )
            .orderBy(desc(notificacoes.criadoEm))
            .limit(10);

          if (novas.length > 0) {
            lastCheck = new Date();
            send(JSON.stringify({ type: "notificacoes", data: novas }));
          }
        } catch {
          clearInterval(pollTimer);
          clearInterval(keepAliveTimer);
        }
      }, 3000);

      // Keepalive every 25 seconds to prevent connection timeout
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
