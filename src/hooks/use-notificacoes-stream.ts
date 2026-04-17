"use client";

import { useEffect } from "react";

import { toast } from "sonner";

import { useNotificacoesStore } from "@/stores/notificacoes";

export function useNotificacoesStream() {
  const { setNotificacoes, addNotificacoes } = useNotificacoesStore();

  // Load initial notifications
  useEffect(() => {
    fetch("/api/notificacoes")
      .then((r) => r.json())
      .then((d) => {
        if (d.notificacoes) setNotificacoes(d.notificacoes, d.naoLidasCount ?? 0);
      })
      .catch(() => undefined);
  }, [setNotificacoes]);

  // SSE stream for real-time updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      eventSource = new EventSource("/api/notificacoes/stream");

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === "notificacoes" && Array.isArray(parsed.data)) {
            const existingIds = new Set(useNotificacoesStore.getState().notificacoes.map((n) => n.id));
            const toastTipos = new Set(["comentario", "status_alterado", "atribuicao"]);
            for (const n of parsed.data) {
              if (n?.id && !existingIds.has(n.id) && !n.lida && n?.tipo && toastTipos.has(n.tipo)) {
                toast.info(n.mensagem ?? "Nova notificação.");
              }
            }
            addNotificacoes(parsed.data);
          }
        } catch {
          // ignore parse errors
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        // Reconnect after 5 seconds
        retryTimeout = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      clearTimeout(retryTimeout);
      eventSource?.close();
    };
  }, [addNotificacoes]);
}
