"use client";

import { useEffect } from "react";

import { useChamadosRealtimeStore } from "@/stores/chamados-realtime";

/** Mantém um EventSource em `/api/chamados/stream` e notifica a store em caso de mutação. */
export function useChamadosRealtimeStream() {
  const notifyMutacao = useChamadosRealtimeStore((s) => s.notifyMutacao);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      eventSource = new EventSource("/api/chamados/stream");

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as { type?: string; chamadoIds?: string[] };
          if (parsed.type === "mutacao" && Array.isArray(parsed.chamadoIds) && parsed.chamadoIds.length > 0) {
            notifyMutacao(parsed.chamadoIds);
          }
        } catch {
          // ignore
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        retryTimeout = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      clearTimeout(retryTimeout);
      eventSource?.close();
    };
  }, [notifyMutacao]);
}
